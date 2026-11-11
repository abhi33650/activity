const $ = (id) => document.getElementById(id);

const interval = $("interval");
const unit = $("unit");
const action = $("action");
const customKey = $("customKey");
const customKeyRow = $("customKeyRow");
const startBtn = $("startBtn");
const stopBtn = $("stopBtn");
const testBtn = $("testBtn");
const statusText = $("statusText");
const countdown = $("countdown");
const actionHint = $("actionHint");

let running = false;
let nextActionAt = 0;

const presets = {
  "shift": "shift",
  "ctrl": "control",
  "alt": "alt",
  "space": "space",
  "enter": "enter",
  "f15": "f15"
};

function getAction() {
  if (action.value === "mouse") {
    return { type: "mouse" };
  }

  if (action.value === "custom") {
    return {
      type: "key",
      key: customKey.value.trim().toLowerCase()
    };
  }

  return {
    type: "key",
    key: presets[action.value]
  };
}

function intervalToMs() {
  const value = Number(interval.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Enter a valid interval.");
  }

  if (unit.value === "seconds") return value * 1000;
  if (unit.value === "hours") return value * 60 * 60 * 1000;
  return value * 60 * 1000;
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function updateActionUI() {
  const isCustom = action.value === "custom";
  customKeyRow.hidden = !isCustom;

  const labels = {
    shift: "Press Shift",
    ctrl: "Press Ctrl",
    alt: "Press Alt",
    space: "Press Space",
    enter: "Press Enter",
    f15: "Press F15",
    mouse: "Move mouse 1px and back",
    custom: "Press your custom key"
  };

  actionHint.textContent = labels[action.value];
}

function setUI(isRunning) {
  running = isRunning;
  startBtn.disabled = isRunning;
  stopBtn.disabled = !isRunning;
  interval.disabled = isRunning;
  unit.disabled = isRunning;
  action.disabled = isRunning;
  customKey.disabled = isRunning;

  statusText.textContent = isRunning ? "Running" : "Stopped";
  statusText.className = isRunning ? "status running" : "status stopped";
}

action.addEventListener("change", updateActionUI);

startBtn.addEventListener("click", async () => {
  try {
    const intervalMs = intervalToMs();
    const selectedAction = getAction();

    if (selectedAction.type === "key" && !selectedAction.key) {
      throw new Error("Enter a keyboard key.");
    }

    await window.autoActivity.start({
      intervalMs,
      action: selectedAction
    });
  } catch (error) {
    alert(error.message);
  }
});

stopBtn.addEventListener("click", () => {
  window.autoActivity.stop();
});

testBtn.addEventListener("click", async () => {
  try {
    const selectedAction = getAction();
    if (selectedAction.type === "key" && !selectedAction.key) {
      throw new Error("Enter a keyboard key.");
    }
    await window.autoActivity.test(selectedAction);
  } catch (error) {
    alert(error.message);
  }
});

window.autoActivity.onStatus((data) => {
  nextActionAt = data.nextActionAt;
  setUI(data.running);

  if (data.running && data.nextActionAt) {
    countdown.textContent = formatTime(data.nextActionAt - Date.now());
  } else {
    countdown.textContent = "Not running";
  }
});

window.autoActivity.onError((message) => {
  alert(`Action error: ${message}`);
});

setInterval(() => {
  if (running && nextActionAt) {
    countdown.textContent = formatTime(nextActionAt - Date.now());
  }
}, 200);

updateActionUI();
setUI(false);
