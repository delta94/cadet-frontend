import { resize } from '../utils/SpriteUtils';
import { blink } from './FadeEffect';

/**
 * Augments the Phaser.GameObjects.Image to enable glow effect
 * for an image. Glow effect enables an image to blink with a tint of yellow
 *
 * This is for the make_object_glow action
 */
export default class GlowingImage {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private imageGlow: Phaser.GameObjects.Image;
  private clickArea: Phaser.GameObjects.Image;
  private glowClearer?: () => void;
  private blinkClearer?: () => void;

  /**
   * Constructor for a GlowingImage
   *
   * @param scene - the scene in which to add this object to
   * @param x - the x coordinate of the center of the object
   * @param y - the y coordinate of the center of the object
   * @param assetKey - the asset key of the image to render this object
   * @param width - optional display width of the object
   * @param height - optional displayheight of the object
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    assetKey: string,
    width?: number,
    height?: number
  ) {
    this.scene = scene;
    this.container = new Phaser.GameObjects.Container(scene, x, y);
    const image = new Phaser.GameObjects.Image(scene, 0, 0, assetKey);
    this.imageGlow = new Phaser.GameObjects.Image(scene, 0, 0, assetKey)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.clickArea = new Phaser.GameObjects.Image(scene, 0, 0, assetKey)
      .setAlpha(0.01)
      .setInteractive({ pixelPerfect: true });

    if (width) {
      resize(image, width, height);
      resize(this.imageGlow, width, height);
      resize(this.clickArea, width, height);
    }

    this.container.add([image, this.imageGlow, this.clickArea]);
  }

  public startGlow() {
    this.glowClearer && this.glowClearer();
    this.glowClearer = blink(this.scene, this.imageGlow);
    this.imageGlow.setAlpha(1);
  }

  public clearGlow() {
    this.glowClearer && this.glowClearer();
    this.imageGlow.setAlpha(0);
  }

  public startBlink() {
    this.blinkClearer = blink(this.scene, this.getContainer());
  }

  public clearBlink() {
    this.getContainer().setAlpha(1);
    this.blinkClearer && this.blinkClearer();
  }

  public getContainer() {
    return this.container;
  }

  public getClickArea() {
    return this.clickArea;
  }
}
