const fs = require("fs-extra");
const path = require("path");
const vscode = require("vscode");
const os = require('os')

async function duplicateAndBackupFolderDefault() {
  const workspaceFolders1 = vscode.workspace.workspaceFolders;

  const currentFolder = workspaceFolders1[0].uri.fsPath;
  console.log(currentFolder);
  console.log(workspaceFolders1[0].uri);

  const backupFolder = `C:\\Users\\${os.userInfo().username}\\\OneDrive\\Desktop\\Backups`
  console.log(os.userInfo().username);

  const sourceFolder = currentFolder;

  // Create the backup folder if it doesn't exist
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
  }

  // Format the folder name to ensure it's valid
  const date = new Date();
  const m = date.getMonth() + 1;
  const h = date.getHours() + 1;
  const currentFolderName = currentFolder.split("\\").pop();
  const timestamp = `${date.getFullYear()}${m}${date.getDate()}-${h}.${date.getMinutes()}`;
  const sanitizedFolderName = currentFolderName.replace(/[\\/:"*?<>|]/g, "_"); // Replace invalid characters
  const backupFolderName = `${sanitizedFolderName} - ${timestamp}`;
  console.log(backupFolderName);
  const backupFolderPath = path.join(backupFolder, backupFolderName);
  console.log(backupFolderPath);

  try {
    await fs.copy(sourceFolder, backupFolderPath);
    vscode.window.showInformationMessage(
      `Folder backed up to ${backupFolderPath}`
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Error: ${err.message}`);
  }
}

async function duplicateAndBackupFolderPrompt() {
  const workspaceFolders1 = vscode.workspace.workspaceFolders;

  const currentFolder = workspaceFolders1[0].uri.fsPath;
  console.log(currentFolder);
  console.log(workspaceFolders1[0].uri);

	let backupFolder;
  await vscode.window.showInputBox({
		prompt: 'Backup folder address:',
		value: `C:\\Users\\${os.userInfo().username}\\OneDrive\\Desktop\\Backups`
	}).then((input) => {
		if (fs.pathExists(input) && fs.statSync(input).isDirectory()) {
			backupFolder = input
		} else {
			vscode.window.showErrorMessage("That is not a valid Directory.");
		}
	})
  console.log(os.userInfo().username);

  const sourceFolder = currentFolder;

  // Create the backup folder if it doesn't exist
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
  }

  // Format the folder name to ensure it's valid
  const date = new Date();
  const m = date.getMonth() + 1;
  const h = date.getHours() + 1;
  const currentFolderName = currentFolder.split("\\").pop();
  const timestamp = `${date.getFullYear()}${m}${date.getDate()}-${h}.${date.getMinutes()}`;
  const sanitizedFolderName = currentFolderName.replace(/[\\/:"*?<>|]/g, "_"); // Replace invalid characters
  const backupFolderName = `${sanitizedFolderName} - ${timestamp}`;
  console.log(backupFolderName);
  const backupFolderPath = path.join(backupFolder, backupFolderName);
  console.log(backupFolderPath);

  try {
    await fs.copy(sourceFolder, backupFolderPath);
    vscode.window.showInformationMessage(
      `Folder backed up to ${backupFolderPath}`
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Error: ${err.message}`);
  }
}

class EmptyTreeViewProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    // Return an empty array for the root node to create an empty tree view
    return [];
  }
}

const emptyTreeViewProvider = new EmptyTreeViewProvider();

module.exports = {
  activate(context) {
    vscode.window.createTreeView("emptyTreeView", {
      treeDataProvider: emptyTreeViewProvider,
    });

    let disposable = vscode.commands.registerCommand(
      "duplifolder.backupFolderDefault",
      duplicateAndBackupFolderDefault
    );
    context.subscriptions.push(disposable);
		let disposable1 = vscode.commands.registerCommand(
      "duplifolder.backupFolderPrompt",
      duplicateAndBackupFolderPrompt
    );
    context.subscriptions.push(disposable1);
  }
};