const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const ignore = require("ignore");

const settingsFilePath = path.join(os.homedir(), ".dupset");

let customBackupPaths = [];
let backupHistory = [];

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
  const gitIgnorePath = path.join(folderPath, ".gitignore");
  const dupIgnorePath = path.join(folderPath, ".duplifolderignore");

  let patterns = [];

  if (fs.existsSync(gitIgnorePath)) {
    const gitPatterns = fs.readFileSync(gitIgnorePath, "utf-8")
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);
    patterns.push(...gitPatterns);
  }

  if (fs.existsSync(dupIgnorePath)) {
    const dupPatterns = fs.readFileSync(dupIgnorePath, "utf-8")
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);
    patterns.push(...dupPatterns);
  }

  return ignore().add(patterns);
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
  const settings = fs.readJsonSync(settingsFilePath, { throws: false }) || {};
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
    if (element.iconPath) item.iconPath = element.iconPath;
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
      ...customBackupPaths.map((entry, index) => ({
        label: `Backup to ${entry.name || entry.path}`,
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
  const ig = readIgnorePatterns(folderPath);
  const allItems = fs.readdirSync(folderPath);
  const itemsToBackup = ig.filter(allItems);

  for (const item of itemsToBackup) {
    fs.copySync(
      path.join(folderPath, item),
      path.join(destinationPath, item)
    );
  }

  backupHistory.unshift({ timestamp, destination: destinationPath });
  if (backupHistory.length > 20) backupHistory = backupHistory.slice(0, 20);
  saveBackupHistory(backupHistory);
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

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Backing up folder...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });
          await backup(folderPath, destination);
          progress.report({ increment: 100 });
        }
      );

      vscode.window.showInformationMessage(`Backed up to ${destination}`);
      historyProvider.refresh();
    }
  };

  const registerCustomCommands = () => {
    customBackupPaths.forEach((entry, index) => {
      const cmd = `duplifolder.backupFolderCustomPath-${index}`;
      const disposable = vscode.commands.registerCommand(cmd, () =>
        handleCustomBackup(entry.path)
      );
      context.subscriptions.push(disposable);
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("duplifolder.customLocation", async () => {
      const customPath = await vscode.window.showInputBox({
        prompt: "Enter a custom backup path",
        value: path.join(os.homedir(), "Backups"),
      });

      const name = await vscode.window.showInputBox({
        prompt: "Enter a name for this backup location (optional)",
      });

      if (customPath && fs.existsSync(customPath)) {
        customBackupPaths.push({ name: name || customPath, path: customPath });
        saveCustomBackupPaths(customBackupPaths);
        registerCustomCommands();
        optionsProvider.refresh();
      } else {
        vscode.window.showErrorMessage("Invalid path.");
      }
    }),

    vscode.commands.registerCommand("duplifolder.backupFolderDefault", async () => {
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

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Backing up folder...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });
          await backup(folderPath, destination);
          progress.report({ increment: 100 });
        }
      );

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
