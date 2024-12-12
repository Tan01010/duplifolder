const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

class BackupTreeDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getChildren(element) {
    if (!element) {
      return [
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
      ];
    }
    return [];
  }

  getTreeItem(element) {
    const treeItem = new vscode.TreeItem(element.label);
    treeItem.command = { command: element.command, title: element.label };
    return treeItem;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

let customBackupPaths = [];

function getDynamicBackupPath() {
  const homeDir = os.homedir();
  if (os.platform() === "win32") {
    return path.join(homeDir, "OneDrive\\Desktop", "Backups");
  } else if (os.platform() === "darwin") {
    return path.join(homeDir, "Documents", "Backups");
  } else if (os.platform() === "linux") {
    return path.join(homeDir, "Backups");
  } else {
    throw new Error("Unsupported operating system");
  }
}

function activate(context) {
  const { subscriptions } = context;
  const treeDataProvider = new BackupTreeDataProvider();
  vscode.window.createTreeView("duplifolder", { treeDataProvider });

  async function setCustomBackupPath() {
    const customPath = await vscode.window.showInputBox({
      prompt: "Enter a custom backup path",
      value: getDynamicBackupPath(),
    });

    if (customPath && fs.pathExistsSync(customPath)) {
      customBackupPaths.push(customPath);

      // Dynamically register the new command
      const index = customBackupPaths.length - 1;
      const disposable = vscode.commands.registerCommand(
        `duplifolder.backupFolderCustomPath-${index}`,
        () => {
          const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
          if (folderPath) {
            const destinationPath = path.join(
              customPath,
              path.basename(folderPath)
            );
            fs.copySync(folderPath, destinationPath);
            vscode.window.showInformationMessage(
              `Folder backed up to ${destinationPath}`
            );
          } else {
            vscode.window.showErrorMessage("No folder selected for backup.");
          }
        }
      );

      context.subscriptions.push(disposable);

      vscode.window.showInformationMessage(
        `Custom backup path set to ${customPath}`
      );

      const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      if (folderPath) {
        const destinationPath = path.join(
          customPath,
          path.basename(folderPath)
        );
        fs.copySync(folderPath, destinationPath);
        vscode.window.showInformationMessage(
          `Folder backed up to custom location: ${destinationPath}`
        );
      } else {
        vscode.window.showErrorMessage("No folder selected for backup.");
      }

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
        const defaultBackupPath = getDynamicBackupPath();
        const destinationPath = path.join(
          defaultBackupPath,
          path.basename(folderPath)
        );
        fs.copySync(folderPath, destinationPath);
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
    disposable = vscode.commands.registerCommand(
      `duplifolder.backupFolderCustomPath-${index}`,
      () => {
        const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        if (folderPath) {
          const destinationPath = path.join(
            customPath,
            path.basename(folderPath)
          );
          fs.copySync(folderPath, destinationPath);
          vscode.window.showInformationMessage(
            `Folder backed up to ${destinationPath}`
          );
        } else {
          vscode.window.showErrorMessage("No folder selected for backup.");
        }
      }
    );
    subscriptions.push(disposable);
  });
}

function deactivate() {
  // Clean up if necessary
}

module.exports = {
  activate,
  deactivate,
};
