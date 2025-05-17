const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const settingsFilePath = path.join(os.homedir(), ".dupset");

let customBackupPaths = [];
let backupHistory = [];
let customCommandDisposables = []; // <-- track custom commands here

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${month}${day}${year}-${hour}.${minute}`;
}

function readIgnorePatterns(folderPath) {
  const ignoreFilePath = path.join(folderPath, ".duplifolderignore");
  if (fs.existsSync(ignoreFilePath)) {
    return fs
      .readFileSync(ignoreFilePath, "utf-8")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function filterIgnoredFiles(folderPath, ignorePatterns) {
  return fs.readdirSync(folderPath).filter((item) => {
    const matches = ignorePatterns.some((pattern) => {
      const regex = new RegExp(escapeRegex(pattern).replace(/\\\*/g, ".*"));
      return regex.test(item);
    });
    return !matches;
  });
}

// === Loaders and savers ===

function loadCustomBackupPaths() {
  if (fs.existsSync(settingsFilePath)) {
    const settings = fs.readJsonSync(settingsFilePath, { throws: false });
    return settings.customBackupPaths || [];
  }
  return [];
}

function saveCustomBackupPaths(paths) {
  const settings = fs.existsSync(settingsFilePath)
    ? fs.readJsonSync(settingsFilePath, { throws: false })
    : {};
  settings.customBackupPaths = paths;
  fs.writeJsonSync(settingsFilePath, settings);
}

function loadBackupHistory() {
  if (fs.existsSync(settingsFilePath)) {
    const settings = fs.readJsonSync(settingsFilePath, { throws: false });
    return settings.backupHistory || [];
  }
  return [];
}

function saveBackupHistory(history) {
  const settings = fs.existsSync(settingsFilePath)
    ? fs.readJsonSync(settingsFilePath, { throws: false })
    : {};
  settings.backupHistory = history;
  fs.writeJsonSync(settingsFilePath, settings);
}

// === Tree Providers ===

class OptionsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    const item = new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.None
    );
    if (element.command) {
      item.command = { command: element.command, title: element.label };
    }
    item.contextValue = element.contextValue;
    if (element.iconPath) {
      item.iconPath = element.iconPath;
    }
    return item;
  }

  getChildren() {
    const children = [
      {
        label: "Backup to default location",
        command: "duplifolder.backupFolderDefault",
      },
      {
        label: "Backup to custom location",
        command: "duplifolder.customLocation",
      },
      ...customBackupPaths.map(({ name, path }, index) => ({
        label: `Backup to ${name} (${path})`,
        command: `duplifolder.backupFolderCustomPath-${index}`,
      })),
    ];

    if (customBackupPaths.length > 0) {
      children.push({
        label: "Delete All Custom Locations",
        command: "duplifolder.deleteAllCustomLocations",
        contextValue: "delete",
        iconPath: new vscode.ThemeIcon("trash"),
      });
    }

    return children;
  }
}

class HistoryProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.None
    );
  }

  getChildren() {
    return backupHistory.map((entry) => ({
      label: `${entry.timestamp} → ${entry.destination}`,
    }));
  }
}

// === Backup Function ===

async function backup(folderPath, destinationPath) {
  const timestamp = getTimestamp();
  const ignorePatterns = readIgnorePatterns(folderPath);
  const itemsToBackup = filterIgnoredFiles(folderPath, ignorePatterns);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Backing up to ${destinationPath}`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      const totalItems = itemsToBackup.length;
      console.log(`Total items to backup: ${totalItems}`);
      for (let i = 0; i < totalItems; i++) {
        const item = itemsToBackup[i];
        const src = path.join(folderPath, item);
        const dest = path.join(destinationPath, item);

        fs.copySync(src, dest);

        progress.report({
          message: `Copying ${item}...`,
          increment: 100 / totalItems,
        });
      }

      backupHistory.unshift({ timestamp, destination: destinationPath });
      if (backupHistory.length > 20) backupHistory = backupHistory.slice(0, 20);
      saveBackupHistory(backupHistory);
    }
  );
}


// === Activate ===

function activate(context) {
  customBackupPaths = loadCustomBackupPaths();
  backupHistory = loadBackupHistory();

  const optionsProvider = new OptionsProvider();
  const historyProvider = new HistoryProvider();

  vscode.window.createTreeView("backupsection", {
    treeDataProvider: optionsProvider,
  });
  vscode.window.createTreeView("backuphistory", {
    treeDataProvider: historyProvider,
  });

  const handleCustomBackup = async (customPath) => {
    const folderPath =
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : null;
    if (folderPath && fs.existsSync(customPath)) {
      const timestamp = getTimestamp();
      const destination = path.join(
        customPath,
        `${path.basename(folderPath)} - ${timestamp}`
      );
      await backup(folderPath, destination);
      vscode.window.showInformationMessage(`Backed up to ${destination}`);
      historyProvider.refresh();
    }
  };

  // Clear previous custom command disposables and unregister them
  function clearCustomCommands() {
    customCommandDisposables.forEach((disposable) => disposable.dispose());
    customCommandDisposables = [];
  }

  const registerCustomCommands = () => {
    clearCustomCommands();
    customBackupPaths.forEach(({ path: customPath }, index) => {
      const cmd = `duplifolder.backupFolderCustomPath-${index}`;
      const disposable = vscode.commands.registerCommand(cmd, () =>
        handleCustomBackup(customPath)
      );
      customCommandDisposables.push(disposable);
      context.subscriptions.push(disposable);
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("duplifolder.customLocation", async () => {
      const customPath = await vscode.window.showInputBox({
        prompt: "Enter a custom backup path",
        value: path.join(os.homedir(), "Backups"),
      });

      if (customPath && fs.existsSync(customPath)) {
        // Ask for a name too
        const name = await vscode.window.showInputBox({
          prompt: "Enter a name for this backup location",
          value: path.basename(customPath),
        });
        if (!name) {
          return vscode.window.showErrorMessage("Backup location name is required.");
        }

        customBackupPaths.push({ name, path: customPath });
        saveCustomBackupPaths(customBackupPaths);
        registerCustomCommands();
        optionsProvider.refresh();
      } else {
        vscode.window.showErrorMessage("Invalid path.");
      }
    }),

    vscode.commands.registerCommand("duplifolder.backupFolderDefault", () => {
      const folderPath =
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
          ? vscode.workspace.workspaceFolders[0].uri.fsPath
          : null;

      if (!folderPath)
        return vscode.window.showErrorMessage("No folder selected.");
      const defaultPath = path.join(os.homedir(), "Desktop", "Backups");
      const timestamp = getTimestamp();
      const destination = path.join(
        defaultPath,
        `${path.basename(folderPath)} - ${timestamp}`
      );
      backup(folderPath, destination);
      vscode.window.showInformationMessage(
        `Folder backed up to ${destination}`
      );
      historyProvider.refresh();
    }),

    vscode.commands.registerCommand(
      "duplifolder.deleteAllCustomLocations",
      () => {
        customBackupPaths = [];
        saveCustomBackupPaths([]);
        clearCustomCommands();
        optionsProvider.refresh();
        vscode.window.showInformationMessage("All custom locations deleted.");
      }
    )
  );

  registerCustomCommands();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
