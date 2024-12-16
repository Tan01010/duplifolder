# Duplifolder VS Code Extension

`Duplifolder` is a Visual Studio Code extension that helps you easily back up your projects to default or custom locations, while allowing you to ignore specific files or folders during the backup process.

### Features:
- Backup your folder to a default location or any custom location of your choice.
- Ignore specific files or folders during the backup process using `.duplifolderignore`.
- Easily manage custom backup paths.

### How It Works:
1. **Backup to Default Location**: Backup your folder to the default location (`Desktop/Backups`) with a timestamp.
2. **Custom Backup Locations**: Add and manage custom backup locations. You can add multiple custom paths, and each can be used to backup your project.
3. **Ignore Files/Folders**: Use the `.duplifolderignore` file in your project folder to specify which files or folders should be ignored during the backup process.

---

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
3. Search for `Duplifolder` and click **Install**.

---

## Configuration

### `.duplifolderignore` file

You can create a `.duplifolderignore` file in the root of your project to specify files and folders you want to ignore during the backup process. Each pattern you want to ignore should be written on a new line.

#### How to use `.duplifolderignore`:

- **Ignore all files with a specific extension**:
  - To ignore all `.html` files, simply add `.html` on a new line in the `.duplifolderignore` file:
    ```text
    .html
    ```

- **Ignore a specific folder**:
  - To ignore an entire folder, just type the name of the folder:
    ```text
    folder_name
    ```

- **Ignore a specific file**:
  - To ignore a specific file, simply type the file's name:
    ```text
    file_name.ext
    ```

- **Multiple Patterns**:
  - You can add multiple ignore patterns, one per line. For example:
    ```text
    .html
    folder_name
    file_to_ignore.txt
    ```

---

## Usage

### Commands:

- **Backup to Default Location**: 
  - This will back up your folder to the default location (usually `Desktop/Backups`), with a timestamp.
  - Command: `Duplifolder: Backup to Default Location`

- **Backup to Custom Location**: 
  - You can add custom locations where you'd like to store your backups.
  - Command: `Duplifolder: Backup to Custom Location`

- **Manage Custom Backup Locations**:
  - You can add, edit, or remove custom backup paths from the settings. You can have multiple custom locations.
  - Command: `Duplifolder: Manage Custom Backup Locations`

- **Delete All Custom Locations**: 
  - This will remove all custom backup locations.
  - Command: `Duplifolder: Delete All Custom Locations`

---

## Example `.duplifolderignore` file:

```text
# Ignore all .html files
.html

# Ignore the "dist" folder
dist

# Ignore a specific file "example.txt"
example.txt

# Ignore the "node_modules" folder
node_modules

```
This file tells the extension to ignore:

-   All `.html` files,
-   The `dist` folder,
-   The specific file `example.txt`,
-   The `node_modules` folder.

* * * * *

Feedback
--------

We'd love to hear from you! If you have any questions, suggestions, or feedback, feel free to ask or leave a review.

-   **Ask Questions**: If you encounter any issues or need help with using the extension, please open a question on the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/).
-   **Leave a Review**: If you like the extension, consider leaving a review to help others find it. Your feedback is important to us!

* * * * *

Credits
-------

This extension is built with the help of various modules, including the `fs-extra` library for file system operations, and the `path` module to handle file paths.

* * * * *

License
-------

This project is licensed under the MIT License - see the LICENSE file for details.