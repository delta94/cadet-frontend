import { Card, Elevation, Intent, Switch } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';
import * as React from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

import controlButton from '../../../../commons/ControlButton';
import { showWarningMessage } from '../../../../commons/utils/NotificationsHelper';

export type DropzoneProps = DispatchProps;

type DispatchProps = {
  handleUploadAssessment: (file: File, forceUpdate: boolean) => void;
};

const MaterialDropzone: React.FunctionComponent<DropzoneProps> = props => {
  const [file, setFile] = React.useState<File | undefined>(undefined);
  const [isWarningShown, setPromptShown] = React.useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = React.useState<boolean>(false);

  const { handleUploadAssessment } = props;

  const handleConfirmUpload = React.useCallback(() => {
    if (file) {
      handleUploadAssessment(file, forceUpdate);
      setForceUpdate(false);
    }
    setFile(undefined);
  }, [file, forceUpdate, handleUploadAssessment]);
  const handleCancelUpload = React.useCallback(() => setFile(undefined), [setFile]);

  const handleDropAccepted = React.useCallback(
    (acceptedFiles: File[]) => {
      setFile(acceptedFiles[0]);
      setForceUpdate(false);
    },
    [setFile]
  );
  const handleDropRejected = React.useCallback((rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 1) {
      showWarningMessage('Uploading multiple files at once is not currently supported!', 2000);
    }
  }, []);

  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    multiple: false,
    onDropAccepted: handleDropAccepted,
    onDropRejected: handleDropRejected
  });

  const classList = React.useMemo(() => {
    return classNames(
      'dropzone-base',
      isFocused || isDragActive ? 'dropzone-active' : undefined,
      isDragAccept ? 'dropzone-accept' : undefined,
      isDragReject ? 'dropzone-reject' : undefined
    );
  }, [isFocused, isDragActive, isDragAccept, isDragReject]);

  const handleSwitchOnChange = React.useCallback(() => {
    if (!forceUpdate) {
      setPromptShown(true);
    } else {
      setForceUpdate(false);
    }
  }, [forceUpdate, setPromptShown, setForceUpdate]);

  const toggleButton = React.useMemo(
    () => (
      <div className="toggle-button-wrapper">
        <Switch checked={forceUpdate} onChange={handleSwitchOnChange} />
      </div>
    ),
    [forceUpdate, handleSwitchOnChange]
  );

  const handleConfirmForceUpdate = React.useCallback(() => {
    setForceUpdate(true);
    setPromptShown(false);
  }, [setForceUpdate]);
  const handleCancelForceUpdate = React.useCallback(() => {
    setPromptShown(false);
  }, [setPromptShown]);

  const confirmationPrompt = React.useMemo(
    () => (
      <div className="dropzone-controls">
        {controlButton('Yes', IconNames.CONFIRM, handleConfirmForceUpdate, {
          minimal: false,
          intent: Intent.DANGER
        })}
        {controlButton('No', IconNames.CROSS, handleCancelForceUpdate, {
          minimal: false
        })}
      </div>
    ),
    [handleCancelForceUpdate, handleConfirmForceUpdate]
  );

  return (
    <>
      <Card elevation={Elevation.TWO} interactive={true}>
        <div {...getRootProps({ className: classList })}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop a file here, or click to select a file</p>
        </div>
      </Card>
      {file && (
        <Card className="dropzone-prompt" elevation={Elevation.TWO} interactive={true}>
          <h3>{file?.name}</h3>
          {!isWarningShown && (
            <>
              <div className="dropzone-controls">
                {controlButton('Confirm Upload', IconNames.UPLOAD, handleConfirmUpload, {
                  minimal: false,
                  intent: Intent.DANGER
                })}
                {controlButton('Cancel Upload', IconNames.DELETE, handleCancelUpload, {
                  minimal: false
                })}
              </div>
              <div className="dropzone-controls">
                <p>Force update opened assessment</p>
                {toggleButton}
              </div>
            </>
          )}
          {isWarningShown && <p>Are you sure that you want to force update the assessment?</p>}
          {isWarningShown && confirmationPrompt}
        </Card>
      )}
    </>
  );
};

export default MaterialDropzone;
