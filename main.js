const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage
} = require("electron");

const path = require("path");
const { execFile } = require("child_process");

let mainWindow;
let tray;

let timer = null;
let running = false;
let nextActionAt = 0;

let intervalMs = 5 * 60 * 1000;

let action = {
  type: "key",
  key: "f15"
};


// =====================================================
// CREATE WINDOW
// =====================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 560,
    minWidth: 440,
    minHeight: 520,

    autoHideMenuBar: true,

    backgroundColor: "#111827",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });    
  mainWindow.loadFile("index.html");

  // Closing window = completely stop timer
  mainWindow.on("close", () => {
    stopTimer();
  });
}


// =====================================================
// KEYBOARD ACTION
// =====================================================

function pressKey(key) {
  const keyCodes = {
    space: 0x20,
    enter: 0x0D,
    tab: 0x09,

    esc: 0x1B,
    escape: 0x1B,

    left: 0x25,
    up: 0x26,
    right: 0x27,
    down: 0x28,

    f1: 0x70,
    f2: 0x71,
    f3: 0x72,
    f4: 0x73,
    f5: 0x74,
    f6: 0x75,
    f7: 0x76,
    f8: 0x77,
    f9: 0x78,
    f10: 0x79,
    f11: 0x7A,
    f12: 0x7B,
    f13: 0x7C,
    f14: 0x7D,
    f15: 0x7E,

    backspace: 0x08,
    delete: 0x2E
  };

  const normalizedKey = String(key)
    .trim()
    .toLowerCase();

  let virtualKey = keyCodes[normalizedKey];

  // A-Z
  if (/^[a-z]$/.test(normalizedKey)) {
    virtualKey = normalizedKey.charCodeAt(0);
  }

  // 0-9
  else if (/^[0-9]$/.test(normalizedKey)) {
    virtualKey = normalizedKey.charCodeAt(0);
  }

  if (!virtualKey) {
    throw new Error(
      `Unsupported keyboard key: ${key}`
    );
  }

  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class SafeKeyboard
{
    // ==========================================
    // MOUSE INPUT
    // ==========================================

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }


    // ==========================================
    // KEYBOARD INPUT
    // ==========================================

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }


    // ==========================================
    // HARDWARE INPUT
    // ==========================================

    [StructLayout(LayoutKind.Sequential)]
    public struct HARDWAREINPUT
    {
        public uint uMsg;
        public ushort wParamL;
        public ushort wParamH;
    }


    // ==========================================
    // UNION
    // ==========================================

    [StructLayout(LayoutKind.Explicit)]
    public struct InputUnion
    {
        [FieldOffset(0)]
        public MOUSEINPUT mi;

        [FieldOffset(0)]
        public KEYBDINPUT ki;

        [FieldOffset(0)]
        public HARDWAREINPUT hi;
    }


    // ==========================================
    // INPUT STRUCTURE
    // ==========================================

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT
    {
        public uint type;
        public InputUnion U;
    }


    // ==========================================
    // SEND INPUT
    // ==========================================

    [DllImport(
        "user32.dll",
        SetLastError = true
    )]
    private static extern uint SendInput(
        uint nInputs,
        INPUT[] pInputs,
        int cbSize
    );


    // ==========================================
    // PRESS KEY
    // ==========================================

    public static string PressKey(
        ushort virtualKey
    )
    {
        INPUT[] inputs =
            new INPUT[2];


        // ======================================
        // KEY DOWN
        // ======================================

        inputs[0].type = 1;

        inputs[0].U.ki.wVk =
            virtualKey;

        inputs[0].U.ki.wScan =
            0;

        inputs[0].U.ki.dwFlags =
            0;

        inputs[0].U.ki.time =
            0;

        inputs[0].U.ki.dwExtraInfo =
            UIntPtr.Zero;


        // ======================================
        // KEY UP
        // ======================================

        inputs[1].type = 1;

        inputs[1].U.ki.wVk =
            virtualKey;

        inputs[1].U.ki.wScan =
            0;

        inputs[1].U.ki.dwFlags =
            0x0002;

        inputs[1].U.ki.time =
            0;

        inputs[1].U.ki.dwExtraInfo =
            UIntPtr.Zero;


        // ======================================
        // GET CORRECT WINDOWS STRUCT SIZE
        // ======================================

        int inputSize =
            Marshal.SizeOf(
                typeof(INPUT)
            );


        // ======================================
        // SEND
        // ======================================

        uint result =
            SendInput(
                2,
                inputs,
                inputSize
            );


        // ======================================
        // ERROR
        // ======================================

        if (result != 2)
        {
            int errorCode =
                Marshal.GetLastWin32Error();

            return
                "ERROR:" +
                errorCode +
                ":RESULT:" +
                result +
                ":SIZE:" +
                inputSize;
        }


        return
            "SUCCESS:SIZE:" +
            inputSize;
    }
}
"@


$result =
    [SafeKeyboard]::PressKey(
        [System.UInt16]${virtualKey}
    );


if ($result.StartsWith("ERROR:"))
{
    throw $result;
}




Write-Output $result;
`;

  executePowerShell(psScript);
}


// =====================================================
// MOUSE ACTION
// =====================================================

function moveMouse() {

  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Mouse {

    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(
        out POINT lpPoint
    );

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(
        int X,
        int Y
    );

    public struct POINT {
        public int X;
        public int Y;
    }

}
"@

$point = New-Object Mouse+POINT;

[Mouse]::GetCursorPos([ref]$point);

[Mouse]::SetCursorPos(
    $point.X + 1,
    $point.Y
);

Start-Sleep -Milliseconds 100;

[Mouse]::SetCursorPos(
    $point.X,
    $point.Y
);
`;

  executePowerShell(psScript);
}


// =====================================================
// POWERSHELL
// =====================================================

function executePowerShell(script) {
  execFile(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ],
    {
      windowsHide: true,
      timeout: 5000
    },
    (error, stdout, stderr) => {

      if (error) {

        const message =
          stderr?.trim() ||
          stdout?.trim() ||
          error.message;

        console.error(
          "PowerShell error:",
          message
        );

        if (
          mainWindow &&
          !mainWindow.isDestroyed()
        ) {
          mainWindow.webContents.send(
            "action-error",
            message
          );
        }

        return;
      }

      console.log(
        "PowerShell:",
        stdout.trim()
      );
    }
  );
}

// =====================================================
// PERFORM ACTION
// =====================================================

function performAction() {

  // VERY IMPORTANT:
  // Do nothing if timer is stopped.

  if (!running) {
    return;
  }

  try {

    if (action.type === "mouse") {

      moveMouse();

    } else {

      pressKey(action.key);

    }

  } catch (error) {

    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {

      mainWindow.webContents.send(
        "action-error",
        error.message
      );

    }

  }
}


// =====================================================
// SEND STATUS
// =====================================================

function sendStatus() {

  if (
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    return;
  }

  mainWindow.webContents.send(
    "timer-status",
    {
      running,
      nextActionAt
    }
  );
}


// =====================================================
// START TIMER
// =====================================================

function startTimer(settings) {

  // Always reset previous timer first
  stopTimer(false);

  intervalMs =
    Math.max(
      1000,
      Number(settings.intervalMs) ||
      5 * 60 * 1000
    );

  action = settings.action;

  running = true;

  // Fresh countdown
  nextActionAt =
    Date.now() + intervalMs;


  timer = setInterval(() => {

    // If stopped, do absolutely nothing
    if (!running) {
      return;
    }


    if (
      Date.now() >= nextActionAt
    ) {

      performAction();

      // Start next interval
      nextActionAt =
        Date.now() + intervalMs;

    }

    sendStatus();

  }, 200);


  sendStatus();
}


// =====================================================
// STOP + RESET TIMER
// =====================================================

function stopTimer(send = true) {

  // Stop interval
  if (timer) {

    clearInterval(timer);

    timer = null;
  }


  // Stop everything
  running = false;


  // Reset countdown
  nextActionAt = 0;


  if (send) {
    sendStatus();
  }
}


// =====================================================
// TRAY
// =====================================================

function createTray() {

  tray = new Tray(
    nativeImage.createEmpty()
  );


  const menu =
    Menu.buildFromTemplate([

      {
        label: "Show AutoActivity",

        click: () => {

          if (mainWindow) {

            mainWindow.show();

            mainWindow.focus();

          }

        }
      },


      {
        label: "Stop Timer",

        click: () => {

          stopTimer();

        }
      },


      {
        type: "separator"
      },


      {
        label: "Quit",

        click: () => {

          stopTimer();

          app.isQuiting = true;

          app.quit();

        }
      }

    ]);


  tray.setToolTip(
    "AutoActivity"
  );

  tray.setContextMenu(menu);


  tray.on(
    "double-click",
    () => {

      if (mainWindow) {

        mainWindow.show();

        mainWindow.focus();

      }

    }
  );
}


// =====================================================
// IPC START
// =====================================================

ipcMain.handle(
  "start-timer",

  (_, settings) => {

    startTimer(settings);

    return true;

  }
);


// =====================================================
// IPC STOP
// =====================================================

ipcMain.handle(
  "stop-timer",

  () => {

    stopTimer();

    return true;

  }
);


// =====================================================
// IPC TEST
// =====================================================

ipcMain.handle(
  "test-action",

  (_, selectedAction) => {

    // Test action should work even when timer
    // is not running.

    const oldRunning = running;

    const oldAction = action;

    action = selectedAction;

    running = true;

    performAction();

    running = oldRunning;

    action = oldAction;

    return true;

  }
);


// =====================================================
// IPC STATUS
// =====================================================

ipcMain.handle(
  "get-status",

  () => {

    return {
      running,
      nextActionAt
    };

  }
);


// =====================================================
// ELECTRON READY WITH UI  I NEED TO UN COMMENT THIS FOR SEEN THE UI 
// =====================================================

// app.whenReady().then(() => {

//   createWindow();

//   createTray();


//   app.on(
//     "activate",

//     () => {

//       if (
//         BrowserWindow
//           .getAllWindows()
//           .length === 0
//       ) {

//         createWindow();

//       } else {

//         mainWindow.show();

//       }

//     }
//   );

// });

// =====================================================
// ELECTRON READY WITHOUT UI 
// =====================================================

app.whenReady().then(() => {
  createTray();

  // Automatically start timer
  startTimer({
    intervalMs: 1 * 60 * 1000,
    action: {
      type: "key",
      key: "f15"
    }
  });
});


// =====================================================
// CLOSE APP  WHEN OPEN IN UI 
// =====================================================

// app.on(
//   "window-all-closed",

//   () => {

//     stopTimer();

//     if (
//       process.platform !== "darwin"
//     ) {

//       app.quit();

//     }

//   }
// );


// =====================================================
// BEFORE QUIT
// =====================================================

app.on(
  "before-quit",

  () => {

    stopTimer();

  }
);