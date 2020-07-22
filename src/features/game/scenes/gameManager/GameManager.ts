import GameActionManager from 'src/features/game/action/GameActionManager';
import GameBBoxManager from 'src/features/game/boundingBoxes/GameBoundingBoxManager';
import { GameCheckpoint } from 'src/features/game/chapter/GameChapterTypes';
import GameCharacterManager from 'src/features/game/character/GameCharacterManager';
import GameDialogueManager from 'src/features/game/dialogue/GameDialogueManager';
import { blackFade } from 'src/features/game/effects/FadeEffect';
import { addLoadingScreen } from 'src/features/game/effects/LoadingScreen';
import GameLayerManager from 'src/features/game/layer/GameLayerManager';
import { LocationId } from 'src/features/game/location/GameMapTypes';
import GameObjectManager from 'src/features/game/objects/GameObjectManager';
import GamePopUpManager from 'src/features/game/popUp/GamePopUpManager';
import SourceAcademyGame from 'src/features/game/SourceAcademyGame';
import GameStateManager from 'src/features/game/state/GameStateManager';
import GameUserStateManager from 'src/features/game/state/GameUserStateManager';

import GameAwardsManager from '../../awards/GameAwardsManager';
import GameBackgroundManager from '../../background/GameBackgroundManager';
import { Constants } from '../../commons/CommonConstants';
import GameEscapeManager from '../../escape/GameEscapeManager';
import GameInputManager from '../../input/GameInputManager';
import { Layer } from '../../layer/GameLayerTypes';
import GamePhaseManager from '../../phase/GamePhaseManager';
import { GamePhaseType } from '../../phase/GamePhaseTypes';
import GameSaveManager from '../../save/GameSaveManager';
import { mandatory, toS3Path } from '../../utils/GameUtils';
import GameGlobalAPI from './GameGlobalAPI';
import { createGamePhases } from './GameManagerHelper';

type GameManagerProps = {
  continueGame: boolean;
  chapterNum: number;
  checkpointNum: number;
  gameCheckpoint: GameCheckpoint;
};

/**
 * Main scene that plays the checkpoint.
 *
 * It processes checkpoint objects and loads
 * the chapter exclusive assets (location image, sounds).
 *
 * It also handles main gameplay loop, e.g. switching between modes,
 * activation of escape or collectible menu, location switching,
 * triggering actions, etc.
 */
class GameManager extends Phaser.Scene {
  public currentLocationId: LocationId;
  private currentCheckpoint: GameCheckpoint | undefined;

  public layerManager: GameLayerManager;
  public stateManager: GameStateManager;
  public objectManager: GameObjectManager;
  public characterManager: GameCharacterManager;
  public dialogueManager: GameDialogueManager;
  public actionManager: GameActionManager;
  public userStateManager: GameUserStateManager;
  public boundingBoxManager: GameBBoxManager;
  public popUpManager: GamePopUpManager;
  public saveManager?: GameSaveManager;
  public escapeManager: GameEscapeManager;
  public phaseManager: GamePhaseManager;
  public backgroundManager: GameBackgroundManager;
  public inputManager: GameInputManager;
  public awardsManager: GameAwardsManager;

  constructor() {
    super('GameManager');
    this.currentCheckpoint = undefined;
    this.currentLocationId = Constants.nullInteractionId;

    this.layerManager = new GameLayerManager();
    this.stateManager = new GameStateManager();
    this.characterManager = new GameCharacterManager();
    this.objectManager = new GameObjectManager();
    this.dialogueManager = new GameDialogueManager();
    this.actionManager = new GameActionManager();
    this.userStateManager = new GameUserStateManager();
    this.boundingBoxManager = new GameBBoxManager();
    this.popUpManager = new GamePopUpManager();
    this.escapeManager = new GameEscapeManager();
    this.phaseManager = new GamePhaseManager();
    this.backgroundManager = new GameBackgroundManager();
    this.inputManager = new GameInputManager();
    this.awardsManager = new GameAwardsManager();
  }

  public init({ gameCheckpoint, continueGame, chapterNum, checkpointNum }: GameManagerProps) {
    SourceAcademyGame.getInstance().setCurrentSceneRef(this);
    SourceAcademyGame.getInstance()
      .getSaveManager()
      .registerGameInfo(chapterNum, checkpointNum, continueGame);
    this.currentCheckpoint = gameCheckpoint;
    this.layerManager = new GameLayerManager();
    this.stateManager = new GameStateManager();
    this.characterManager = new GameCharacterManager();
    this.objectManager = new GameObjectManager();
    this.dialogueManager = new GameDialogueManager();
    this.actionManager = new GameActionManager();
    this.userStateManager = new GameUserStateManager();
    this.boundingBoxManager = new GameBBoxManager();
    this.popUpManager = new GamePopUpManager();
    this.escapeManager = new GameEscapeManager();
    this.phaseManager = new GamePhaseManager();
    this.backgroundManager = new GameBackgroundManager();
    this.inputManager = new GameInputManager();
    this.awardsManager = new GameAwardsManager();
  }

  //////////////////////
  //    Preload       //
  //////////////////////

  public preload() {
    GameGlobalAPI.getInstance().setGameManager(this);
    addLoadingScreen(this);

    this.currentLocationId =
      this.getSaveManager().getLoadedLocation() || this.getCurrentCheckpoint().startingLoc;
    this.stateManager.initialise(this);
    this.userStateManager.initialise();
    this.dialogueManager.initialise(this);
    this.characterManager.initialise(this);
    this.actionManager.initialise(this);
    this.inputManager.initialise(this);
    this.boundingBoxManager.initialise();
    this.objectManager.initialise();
    this.layerManager.initialise(this);
    this.awardsManager.initialise(this, this.userStateManager, this.phaseManager);
    this.phaseManager.initialise(
      createGamePhases(this.escapeManager, this.awardsManager),
      this.inputManager
    );
    this.escapeManager.initialise(this, this.phaseManager);

    this.phaseManager.setCallback(
      async (newPhase: GamePhaseType) => await this.checkpointTransition(newPhase)
    );
    this.preloadLocationsAssets(this.getCurrentCheckpoint());
    this.bindKeyboardTriggers();
  }

  /**
   * Preload all assets (image and sounds) exclusive to the checkpoint.
   *
   * @param checkpoint checkpoint to have its assets loaded
   */
  private preloadLocationsAssets(checkpoint: GameCheckpoint) {
    GameGlobalAPI.getInstance().loadSounds(checkpoint.map.getSoundAssets());
    checkpoint.map.getMapAssets().forEach((assetPath, assetKey) => {
      this.load.image(assetKey, toS3Path(assetPath));
    });
  }

  //////////////////////
  // Location Helpers //
  //////////////////////

  public async create() {
    await this.userStateManager.loadAssessments();
    await this.userStateManager.loadAchievements();
    await this.changeLocationTo(this.currentLocationId, true);
    await GameGlobalAPI.getInstance().saveGame();
  }

  /**
   * Render a location, the assets related to it (objects, character);
   * before executing the following in order (if available):
   *
   * Start Action, Notification, Cutscene
   *
   * Start action is only played whe startAction argument is set to true;
   * commonly only the first time user loads the checkpoint.
   *
   * @param locationId id of the location to render
   * @param startAction if set to true, startAction will be executed
   */
  private async renderLocation(locationId: LocationId, startAction: boolean) {
    const gameLocation = GameGlobalAPI.getInstance().getLocationAtId(locationId);

    // Play the BGM attached to the location
    await GameGlobalAPI.getInstance().playBgMusic(gameLocation.bgmKey);

    // Render all assets related to the location
    this.backgroundManager.renderBackgroundLayerContainer(locationId);
    this.objectManager.renderObjectsLayerContainer(locationId);
    this.boundingBoxManager.renderBBoxLayerContainer(locationId);
    this.characterManager.renderCharacterLayerContainer(locationId);
    this.layerManager.showLayer(Layer.Character);

    await this.phaseManager.swapPhase(GamePhaseType.Sequence);

    // Execute start actions, notif, then cutscene
    if (startAction) {
      await this.actionManager.processGameActions(
        this.getCurrentCheckpoint().map.getStartActions()
      );
    }
    if (!this.stateManager.hasTriggeredInteraction(locationId)) {
      await GameGlobalAPI.getInstance().bringUpUpdateNotif(gameLocation.name);
    }
    await this.actionManager.processGameActions(gameLocation.actionIds);

    await this.phaseManager.swapPhase(GamePhaseType.Menu);
  }

  /**
   * Change the current location to another location, based on the ID.
   * This will properly clean up the previous location. It is highly
   * encouraged to only change location of the game using this method.
   *
   * @param locationId id of location to be changed into
   * @param startAction if set to true, start action will be triggered
   */
  public async changeLocationTo(locationId: LocationId, startAction: boolean = false) {
    this.currentLocationId = locationId;

    // Transition to the new location
    await blackFade(this, 300, 500, async () => {
      await this.layerManager.clearAllLayers();
      await this.renderLocation(locationId, startAction);
    });

    // Update state after location is fully rendered, location has been visited
    this.stateManager.triggerInteraction(locationId);
  }

  /**
   * Bind escape menu and awards menu to keyboard triggers.
   */
  private bindKeyboardTriggers() {
    this.inputManager.registerKeyboardListener(
      Phaser.Input.Keyboard.KeyCodes.ESC,
      'up',
      async () => {
        if (this.phaseManager.isCurrentPhase(GamePhaseType.EscapeMenu)) {
          await this.phaseManager.popPhase();
        } else {
          await this.phaseManager.pushPhase(GamePhaseType.EscapeMenu);
        }
      }
    );
    this.inputManager.registerKeyboardListener(
      Phaser.Input.Keyboard.KeyCodes.TAB,
      'up',
      async () => {
        if (this.phaseManager.isCurrentPhase(GamePhaseType.AwardMenu)) {
          await this.phaseManager.popPhase();
        } else {
          await this.phaseManager.pushPhase(GamePhaseType.AwardMenu);
        }
      }
    );
  }

  /**
   * Clean up on related managers
   */
  public cleanUp() {
    this.inputManager.clearListeners();
    this.layerManager.clearAllLayers();
  }

  /**
   * Checks whether game is able to transition to the next checkpoint.
   * Game is only able to transition to the next checkpoint
   * if all of the objectives of the current checkpoint has been cleared.
   *
   * Additionally, game will only transition if the newPhase is a Menu phase;
   * in order to ensure that we don't transition to the next checkpoint
   * during dialogue/cutscene.
   *
   * This method is passed to the phase manager, to be executed on
   * every phase transition.
   *
   * @param newPhase new phase to transition to
   */
  public async checkpointTransition(newPhase: GamePhaseType) {
    const transitionToNextCheckpoint =
      newPhase === GamePhaseType.Menu && GameGlobalAPI.getInstance().isAllComplete();

    // Transition to the next scene if possible
    if (transitionToNextCheckpoint) {
      await this.actionManager.processGameActions(this.getCurrentCheckpoint().map.getEndActions());
      this.cleanUp();
      this.scene.start('CheckpointTransition');
    }
    return transitionToNextCheckpoint;
  }

  public getCurrentCheckpoint = () => mandatory(this.currentCheckpoint);
  public getSaveManager = () => SourceAcademyGame.getInstance().getSaveManager();
}

export default GameManager;