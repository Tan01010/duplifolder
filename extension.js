const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const settingsFilePath = path.join(os.homedir(), ".dupset");

class BackupTreeDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getChildren(element) {
    if (!element) {
      const items = [
        {
          label: "Backup to default location",
          command: "duplifolder.backupFolderDefault",
        },
        {
          label: "Backup to custom location",
          command: "duplifolder.customLocation",
        },
        ...customBackupPaths.map((path, index) => ({
          label: `Backup to ${path}`,
          command: `duplifolder.backupFolderCustomPath-${index}`,
        })),
        {
          label: "Delete All Custom Locations",
          command: "duplifolder.deleteAllCustomLocations",
          contextValue: "delete",
        },
      ];
      return items;
    }
    return [];
  }

  getTreeItem(element) {
    const treeItem = new vscode.TreeItem(element.label);
    treeItem.command = { command: element.command, title: element.label };
    if (element.contextValue === "delete") {
      treeItem.iconPath = new vscode.ThemeIcon(
        "trash",
        new vscode.ThemeColor("errorForeground")
      );
    }
    treeItem.contextValue = element.contextValue || undefined;
    return treeItem;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

let customBackupPaths = [];

// Load custom paths from the settings file
function loadCustomBackupPaths() {
  if (fs.existsSync(settingsFilePath)) {
    const settings = fs.readJsonSync(settingsFilePath, { throws: false });
    return settings.customBackupPaths || [];
  }
  return [];
}

// Save custom paths to the settings file
function saveCustomBackupPaths(paths) {
  fs.writeJsonSync(settingsFilePath, { customBackupPaths: paths });
}

// Generate a timestamp in the format MMDDYYYY-HH.MM
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${month}${day}${year}-${hour}.${minute}`;
}

// Escape special regex characters in patterns
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Filter ignored files and folders based on multiple patterns
function filterIgnoredFiles(folderPath, ignorePatterns) {
  return fs
    .readdirSync(folderPath)
    .filter((item) => {
      let isIgnored = false;
      // Check each ignore pattern
      ignorePatterns.forEach((pattern) => {
        const escapedPattern = escapeRegex(pattern).replace(/\\\*/g, ".*");
        const regex = new RegExp(escapedPattern);
        if (regex.test(item)) {
          isIgnored = true;
        }
      });
      return !isIgnored; // Only include non-ignored files
    });
}

// Read ignore patterns from .duplifolderignore
function readIgnorePatterns(folderPath) {
  const ignoreFilePath = path.join(folderPath, ".duplifolderignore");
  if (fs.existsSync(ignoreFilePath)) {
    // Read file content, split by new lines and remove empty lines
    const ignorePatterns = fs
      .readFileSync(ignoreFilePath, "utf-8")
      .split("\n")
      .map(line => line.trim()) // Trim spaces around the patterns
      .filter(Boolean); // Remove empty lines

    console.log(`Loaded ignore patterns: ${ignorePatterns.join(", ")}`); // Log loaded patterns
    return ignorePatterns;
  }
  return [];
}

function activate(context) {
  customBackupPaths = loadCustomBackupPaths();

  const { subscriptions } = context;
  const treeDataProvider = new BackupTreeDataProvider();
  vscode.window.createTreeView("duplifolder", { treeDataProvider });

  async function setCustomBackupPath() {
    const customPath = await vscode.window.showInputBox({
      prompt: "Enter a custom backup path",
      value: path.join(os.homedir(), "Backups"),
    });

    if (customPath && fs.pathExistsSync(customPath)) {
      customBackupPaths.push(customPath);
      saveCustomBackupPaths(customBackupPaths);

      const index = customBackupPaths.length - 1;
      const disposable = vscode.commands.registerCommand(
        `duplifolder.backupFolderCustomPath-${index}`,
        () => {
          const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
          if (folderPath) {
            const timestamp = getTimestamp();
            const ignorePatterns = readIgnorePatterns(folderPath);
            const itemsToBackup = filterIgnoredFiles(folderPath, ignorePatterns);
            const destinationPath = path.join(
              customPath,
              `${path.basename(folderPath)} - ${timestamp}`
            );

            itemsToBackup.forEach((item) => {
              fs.copySync(
                path.join(folderPath, item),
                path.join(destinationPath, item)
              );
            });
            vscode.window.showInformationMessage(
              `Folder backed up to ${destinationPath}`
            );
          } else {
            vscode.window.showErrorMessage("No folder selected for backup.");
          }
        }
      );
      subscriptions.push(disposable);

      treeDataProvider.refresh();
    } else {
      vscode.window.showErrorMessage("Invalid path. Please try again.");
    }
  }

  let disposable = vscode.commands.registerCommand(
    "duplifolder.customLocation",
    setCustomBackupPath
  );
  subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "duplifolder.backupFolderDefault",
    () => {
      const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      if (folderPath) {
        const defaultBackupPath = path.join(os.homedir(), "Desktop", "Backups");
        const timestamp = getTimestamp();
        const ignorePatterns = readIgnorePatterns(folderPath);
        const itemsToBackup = filterIgnoredFiles(folderPath, ignorePatterns);
        const destinationPath = path.join(
          defaultBackupPath,
          `${path.basename(folderPath)} - ${timestamp}`
        );

        itemsToBackup.forEach((item) => {
          fs.copySync(
            path.join(folderPath, item),
            path.join(destinationPath, item)
          );
        });
        vscode.window.showInformationMessage(
          `Folder backed up to default location: ${destinationPath}`
        );
      } else {
        vscode.window.showErrorMessage("No folder selected for backup.");
      }
    }
  );
  subscriptions.push(disposable);

  customBackupPaths.forEach((customPath, index) => {
    const command = `duplifolder.backupFolderCustomPath-${index}`;
    const disposable = vscode.commands.registerCommand(command, () => {
      const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      if (folderPath) {
        const timestamp = getTimestamp();
        const ignorePatterns = readIgnorePatterns(folderPath);
        const itemsToBackup = filterIgnoredFiles(folderPath, ignorePatterns);
        const destinationPath = path.join(
          customPath,
          `${path.basename(folderPath)} - ${timestamp}`
        );

        itemsToBackup.forEach((item) => {
          fs.copySync(
            path.join(folderPath, item),
            path.join(destinationPath, item)
          );
        });
        vscode.window.showInformationMessage(
          `Folder backed up to ${destinationPath}`
        );
      } else {
        vscode.window.showErrorMessage("No folder selected for backup.");
      }
    });
    subscriptions.push(disposable);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "duplifolder.deleteAllCustomLocations",
      () => {
        customBackupPaths = [];
        saveCustomBackupPaths(customBackupPaths);
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          "All custom backup locations deleted."
        );
      }
    )
  );

  treeDataProvider.refresh();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
