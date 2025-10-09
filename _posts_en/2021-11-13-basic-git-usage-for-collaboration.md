---
layout: post
title: "Git – Quick Collaboration Workflow"
categories: [Git]
tags: [Git]
---

Here’s the bare minimum Git workflow you need for collaboration. I’ll assume Git is already installed (Windows users can grab it from the official site). I typically use Git Bash, but any Git-capable terminal—VS Code, PyCharm, etc.—works.

<br>

#### 1. Set Up Your Git Identity

Run these once to register your name and email:

```bash
git config --global user.name "<your name>"
git config --global user.email "<your_email@example.com>"
```

Confirm with:

```bash
git config --list
```

Look for `user.name` and `user.email` in the output.

<br>

#### 2. Navigate to the Folder You Want to Push

If you’re new to terminal commands, don’t worry—just a few basics are enough. For example, to move to the desktop:

```bash
ls                 # list files/folders in the current directory
cd Desktop/
```

> Pro tip: type the first few letters and press Tab. If there’s a unique match, the rest auto-completes; otherwise Git Bash shows the possibilities—type a little more and press Tab again.

Once you’re on the desktop:

```bash
ls                 # check what’s here
cd <target-folder> # go into the project you want to push
ls                 # make sure it’s the right folder
```

<br>

#### 3. Push with Git

Run the standard sequence:

```bash
git init
git add .
git commit -m "Describe your changes"
git remote add origin <repository-url>
git branch -M <branch-name>
git push origin <branch-name>
```

Your files should now be in the remote repo.

<br>

#### Common Gotchas (Don’t Panic)

- **“remote origin already exists”**  
  You probably initialized earlier. Remove the existing remote and add the correct one:

  ```bash
  git remote rm origin
  git remote add origin <repository-url>
  ```

- **Push conflicts**  
  If `git push` fails due to conflicts, fetch/pull the latest changes, resolve conflicts locally, commit, then push again.

- **Large files**  
  Git doesn’t handle large binaries well. Exclude them (`.gitignore`) or use Git LFS if necessary.

- **`.git` folder**  
  Git metadata (history, config, etc.) lives in the hidden `.git` directory. Deleting it resets the repo.

<br>

#### Merge Requests

If you pushed to a separate branch, open a pull request so the repository maintainer can review and merge your changes.
