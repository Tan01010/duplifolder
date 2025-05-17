# 📁 Duplifolder – VS Code Backup Utility

Duplifolder is a Visual Studio Code extension that lets you quickly back up your current workspace folder to a custom or default location. It's perfect for developers who want to snapshot their code regularly with named destinations, history tracking, and a user-friendly sidebar interface.

## ✨ Features

- 📂 **Backup Current Workspace Folder**
- 🖱️ One-click backup to:
  - Default location (`~/Desktop/Backups`)
  - Custom locations with optional naming
- 📝 **View backup history** in a dedicated sidebar panel
- ❌ **Delete all saved custom paths**
- 🔄 **Persistent settings** via a file (`~/.dupset`)
- 🚫 **Ignore file support** with `.duplifolderignore`
- 📊 **Progress bar** shows real-time backup progress

## 🧩 Sidebar Views

### 🔧 Options Panel
Accessible from the Activity Bar, it includes:
- **Backup to default location**
- **Backup to custom location**
- **Named custom backup links**
- **Delete all custom locations**

### 📜 History Panel
Displays your last 20 backups:
- Timestamps
- Destination paths

## 📁 Custom Backup Locations with Naming

When choosing a custom backup folder, you'll be prompted to enter:
1. The **path** of the location (must already exist)
2. An optional **name** for the link (to appear in the UI)

You can create multiple named custom locations, and Duplifolder will generate new backup commands for each.

## 🔄 How Backups Work

- Files are copied **excluding ignored patterns** from `.duplifolderignore`.
- The backup folder is named like:  
  `YourFolderName - MMDDYYYY-HH.MM`
- Progress is shown in a notification as files are copied.

## ❗ Ignore Files

Add a `.duplifolderignore` file or include a `.gitignore` to the root of your workspace to exclude files or folders from backups:

```txt
node_modules
.env
*.log
```
Wildcards (*) are supported.

## 🧠 Settings Storage
Your custom locations and backup history are stored in:
```txt
~/.dupset
```
This ensures your configuration persists across sessions.

## 🚀 Activation
Duplifolder is activated when:

 - Any of its commands are executed

 - VS Code is opened or a folder is opened

## 🧑‍💻 Author
**Tanner Ordonez**

Made with ❤️ *for developers* who want peace of mind through instant backups.