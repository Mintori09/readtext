import { getCurrentWindow } from "@tauri-apps/api/window";
import "../styles/titleBar.css";

const appWindow = getCurrentWindow();
type Props = {
  titleBar: String | null;
};

export const TitleBar = ({ titleBar }: Props) => {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="traffic-lights">
        <button className="light minimize" onClick={handleMinimize} />
        <button className="light maximize" onClick={handleMaximize} />
        <button className="light close" onClick={handleClose} />
      </div>
      <div className="title">{titleBar}</div>
    </div>
  );
};

export default TitleBar;
