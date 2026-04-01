########
Title: Project Files — Documents and File Tree
Slug: project-files
Summary: Create documents, organize folders, write rich markdown, upload files, and link between project items.
Sort Order: 14
########

## 🔎 Table of Contents

1. [What is the Files Tab?](olio://help-anchor/what-is-the-files-tab)
2. [Creating Folders](olio://help-anchor/creating-folders)
3. [Creating a Document](olio://help-anchor/creating-a-document)
4. [The Markdown Editor](olio://help-anchor/the-markdown-editor)
5. [Internal Cross-Linking](olio://help-anchor/internal-cross-linking)
6. [File Uploads](olio://help-anchor/file-uploads)
7. [File Tree Navigation](olio://help-anchor/file-tree-navigation)
8. [Moving Files and Folders](olio://help-anchor/moving-files-and-folders)
9. [Deleting Files](olio://help-anchor/deleting-files)
10. [Tips](olio://help-anchor/tips)

---

# 📁 Project Files — Documents and File Tree

The **Files Tab** is a hierarchical document workspace inside each project. It supports rich markdown documents, organized folders, and file uploads — all in one place. You can also cross-link between documents, board cards, planner steps, and resources using Olio's internal link system.

---

## 🧩 What is the Files Tab?

The Files Tab contains two types of items:

| Type | Description |
|:-----|:------------|
| **Document** | A rich markdown file you write and edit in the browser |
| **Upload** | An external file (image, PDF, etc.) attached to the project |

Both live in the same **file tree** and can be organized into folders.

---

## 📂 Creating Folders

1. Right-click anywhere in the file tree, or click the **toolbar icon** for New Folder
2. Select **New Folder**
3. Enter a **Folder Name**
4. Press Enter or click **Confirm**

Folders appear in the tree and can be expanded or collapsed by clicking them.

---

## 📝 Creating a Document

**Standard document:**

1. Click **New Doc** in the file tree toolbar
2. A new untitled document is created and opened in the editor
3. Click the document name at the top to rename it

**Quick Note:**

Click **Quick Note** to create a timestamped draft document instantly — useful for capturing ideas without stopping to name and organize the file.

> 💡 **Tip:** Create a document named `README` at the root of your file tree to summarize the project for collaborators.

---

## ✏️ The Markdown Editor

Documents use a **rich markdown editor**. Supported formatting includes:

| Element | Syntax |
|:--------|:-------|
| Headings | `# H1` through `###### H6` |
| Bold | `**bold**` |
| Italic | `*italic*` |
| Inline code | `` `code` `` |
| Code block | ```` ```language ```` |
| Bullet list | `- item` |
| Numbered list | `1. item` |
| Blockquote | `> text` |
| Table | `\| col \| col \|` |
| Horizontal rule | `---` |
| Checkbox | `- [ ] task` / `- [x] done` |

Changes save automatically as you type.

---

## 🔗 Internal Cross-Linking

You can link between any items inside your project (or to help center articles) using `olio://` links.

**Using the Link Picker:**

1. Position your cursor in the editor where you want a link
2. Right-click to open the **context menu** and select **Insert Link**, or use the toolbar link button
3. The **Link Picker Modal** opens — search for and select a target:
   - Help Center articles and anchors
   - Project files and documents
   - Board cards
   - Planner steps
   - Project resources
4. The link is inserted automatically in the correct format

**Example internal link syntax:**

```markdown
[See the design spec](olio://file/file-id)
[Review card](olio://board_card/card-id)
```

When viewing a document, internal links open the target directly within the project context. Hover over a link to see a **preview tooltip**.

---

## 📎 File Uploads

To upload a file (image, PDF, spreadsheet, etc.):

1. Click the **Upload** button in the file tree toolbar
2. Select a file from your computer, or drag and drop it onto the file tree panel
3. The file appears in the tree with a file-type icon

Uploaded files can be viewed and downloaded from within the project. Images display inline when referenced in a document.

---

## 🗂️ File Tree Navigation

- **Click** a document to open it in the editor
- **Click** a folder to expand or collapse it
- **Right-click** any item to open the **context menu** (rename, move, delete)
- Use the **breadcrumb** at the top of the editor to navigate up the folder hierarchy

---

## ↕️ Moving Files and Folders

**By drag-and-drop:**

1. Click and hold a file or folder in the tree
2. Drag it over the target folder
3. Release to move it

**By context menu:**

1. Right-click the item
2. Select **Move**
3. Choose the destination folder

---

## 🗑️ Deleting Files

1. Right-click the file or folder in the tree
2. Select **Delete**
3. Confirm deletion in the dialog

> ⚠️ **Warning:** Deletion is permanent and cannot be undone. Deleting a folder removes all documents and subfolders inside it. There is no trash or recycle bin.

---

## 💡 Tips

> 💡 **Tip:** Use a `README` doc at the root of your project's file tree to describe the project structure and link to key documents — this helps new collaborators get oriented quickly.

> 💡 **Tip:** Use Quick Notes to capture ideas during a meeting, then organize them into proper documents afterward.
