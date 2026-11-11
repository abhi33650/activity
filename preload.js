const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("autoActivity", {
  start: (settings) => ipcRenderer.invoke("start-timer", settings),
  stop: () => ipcRenderer.invoke("stop-timer"),
  test: (action) => ipcRenderer.invoke("test-action", action),
  getStatus: () => ipcRenderer.invoke("get-status"),
  onStatus: (callback) => {
    ipcRenderer.on("timer-status", (_, data) => callback(data));
  },
  onError: (callback) => {
    ipcRenderer.on("action-error", (_, message) => callback(message));
  }
});
