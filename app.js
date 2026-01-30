const deviceSelect = document.getElementById("device-select");
const buildSelect = document.getElementById("build-select");
const customUrlInput = document.getElementById("custom-url");
const connectButton = document.getElementById("connect");
const flashButton = document.getElementById("flash");
const disconnectButton = document.getElementById("disconnect");
const portStatus = document.getElementById("port-status");
const chipStatus = document.getElementById("chip-status");
const progressLabel = document.getElementById("progress");

const remoteName = document.getElementById("remote-name");
const remoteProtocol = document.getElementById("remote-protocol");
const remoteFrequency = document.getElementById("remote-frequency");
const remoteCode = document.getElementById("remote-code");
const deviceType = document.getElementById("device-type");
const deviceBrand = document.getElementById("device-brand");
const broadcastMode = document.getElementById("broadcast-mode");
const saveRemoteButton = document.getElementById("save-remote");
const exportRemotesButton = document.getElementById("export-remotes");
const clearRemotesButton = document.getElementById("clear-remotes");
const remoteList = document.getElementById("remote-list");
const irEnabledToggle = document.getElementById("ir-enabled");
const irForm = document.getElementById("ir-form");

let firmwareCatalog = {};
let port;
let transport;
let esploader;

const STORAGE_KEY = "ultimate-esp-remotes";

const setStatus = (text, isWarning = false) => {
  portStatus.textContent = text;
  portStatus.classList.toggle("notice", isWarning);
};

const renderFirmwareOptions = () => {
  deviceSelect.innerHTML = "";
  Object.keys(firmwareCatalog).forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device;
    option.textContent = device;
    if (index === 0) {
      option.selected = true;
    }
    deviceSelect.appendChild(option);
  });
  updateBuildOptions();
};

const updateBuildOptions = () => {
  const device = deviceSelect.value;
  const builds = firmwareCatalog[device] || [];
  buildSelect.innerHTML = "";
  builds.forEach((build, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = build.name;
    buildSelect.appendChild(option);
  });
};

const loadFirmwareCatalog = async () => {
  try {
    const response = await fetch("firmware.json");
    if (!response.ok) {
      throw new Error("Firmware catalog niet beschikbaar");
    }
    firmwareCatalog = await response.json();
    renderFirmwareOptions();
  } catch (error) {
    firmwareCatalog = {};
    deviceSelect.innerHTML = "";
    const option = document.createElement("option");
    option.textContent = "Firmware catalog niet geladen";
    deviceSelect.appendChild(option);
    setStatus("Geen firmware catalog", true);
  }
};

const getSelectedFirmware = () => {
  const customUrl = customUrlInput.value.trim();
  if (customUrl) {
    return {
      name: "Custom",
      url: customUrl,
      flashOffset: "0x0",
    };
  }
  const device = deviceSelect.value;
  const index = Number.parseInt(buildSelect.value, 10) || 0;
  const builds = firmwareCatalog[device] || [];
  return builds[index];
};

const setProgress = (value) => {
  progressLabel.textContent = `${Math.round(value)}%`;
};

const updateRemoteList = () => {
  const remotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  remoteList.innerHTML = "";
  if (remotes.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nog geen remotes opgeslagen.";
    remoteList.appendChild(empty);
    return;
  }

  remotes.forEach((remote, index) => {
    const item = document.createElement("li");
    item.className = "remote-item";
    item.innerHTML = `
      <h4>${remote.name}</h4>
      <span>Type: ${remote.deviceType || "Onbekend"} · Merk: ${
  remote.brand || "Onbekend"
}</span>
      <span>Protocol: ${remote.protocol || "Onbekend"}</span>
      <span>Freq: ${remote.frequency} kHz</span>
      <span>Code: ${remote.code}</span>
      <span>Broadcast: ${remote.broadcast ? "Ja" : "Nee"}</span>
      <button data-index="${index}" class="remove-remote">Verwijder</button>
    `;
    remoteList.appendChild(item);
  });

  remoteList.querySelectorAll(".remove-remote").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number.parseInt(event.target.dataset.index, 10);
      const remotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      remotes.splice(index, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remotes));
      updateRemoteList();
    });
  });
};

const setIrEnabled = (enabled) => {
  [
    deviceType,
    deviceBrand,
    remoteName,
    remoteProtocol,
    remoteFrequency,
    remoteCode,
    broadcastMode,
  ].forEach((field) => {
    field.disabled = !enabled;
  });
  [saveRemoteButton, exportRemotesButton, clearRemotesButton].forEach(
    (button) => {
      button.disabled = !enabled;
    }
  );
  irForm.classList.toggle("disabled", !enabled);
};

const saveRemote = () => {
  const name = remoteName.value.trim();
  const code = remoteCode.value.trim();
  if (!name || !code) {
    alert("Naam en code zijn verplicht");
    return;
  }

  const remotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  remotes.unshift({
    name,
    deviceType: deviceType.value,
    brand: deviceBrand.value,
    protocol: remoteProtocol.value.trim(),
    frequency: Number.parseInt(remoteFrequency.value, 10) || 33,
    code,
    broadcast: broadcastMode.checked,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remotes));

  deviceType.value = "tv";
  deviceBrand.value = "";
  remoteName.value = "";
  remoteProtocol.value = "";
  remoteCode.value = "";
  broadcastMode.checked = false;

  updateRemoteList();
};

const exportRemotes = () => {
  const remotes = localStorage.getItem(STORAGE_KEY) || "[]";
  const blob = new Blob([remotes], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "esp-remotes.json";
  link.click();
  URL.revokeObjectURL(link.href);
};

const clearRemotes = () => {
  if (!confirm("Weet je zeker dat je alles wil wissen?")) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  updateRemoteList();
};

const connect = async () => {
  if (!navigator.serial) {
    setStatus("WebSerial niet ondersteund", true);
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    transport = new window.ESPLoader.Transport(port);
    esploader = new window.ESPLoader.ESPLoader({
      transport,
      baudrate: 115200,
      terminal: {
        clean: () => {},
        writeLine: () => {},
        write: () => {},
      },
    });

    const chip = await esploader.main();
    chipStatus.textContent = chip;
    setStatus("Verbonden");
    flashButton.disabled = false;
    disconnectButton.disabled = false;
  } catch (error) {
    console.error(error);
    setStatus("Verbinding mislukt", true);
  }
};

const flashFirmware = async () => {
  const firmware = getSelectedFirmware();
  if (!firmware) {
    alert("Geen firmware geselecteerd");
    return;
  }

  try {
    setProgress(0);
    const response = await fetch(firmware.url);
    if (!response.ok) {
      throw new Error("Firmware download mislukt");
    }
    const data = new Uint8Array(await response.arrayBuffer());

    await esploader.writeFlash({
      fileArray: [{ data, address: firmware.flashOffset }],
      reportProgress: (value) => {
        setProgress(value * 100);
      },
    });

    setProgress(100);
    alert("Flash voltooid!");
  } catch (error) {
    console.error(error);
    alert("Flash mislukt: " + error.message);
  }
};

const disconnect = async () => {
  try {
    if (transport) {
      await transport.disconnect();
    }
    if (port) {
      await port.close();
    }
  } catch (error) {
    console.error(error);
  }
  port = null;
  transport = null;
  esploader = null;
  chipStatus.textContent = "-";
  setStatus("niet verbonden");
  flashButton.disabled = true;
  disconnectButton.disabled = true;
};

loadFirmwareCatalog();
updateRemoteList();
setIrEnabled(false);

deviceSelect.addEventListener("change", updateBuildOptions);
connectButton.addEventListener("click", connect);
flashButton.addEventListener("click", flashFirmware);
disconnectButton.addEventListener("click", disconnect);

saveRemoteButton.addEventListener("click", saveRemote);
exportRemotesButton.addEventListener("click", exportRemotes);
clearRemotesButton.addEventListener("click", clearRemotes);
irEnabledToggle.addEventListener("change", (event) => {
  setIrEnabled(event.target.checked);
});
