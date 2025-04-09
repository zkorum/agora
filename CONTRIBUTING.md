# Contributing

Thank you for contributing to ZKorum! ❤️

## AUTHORS file

Every contributor must add their full name and email address in the [AUTHORS file](./AUTHORS). Anonymous contributions are not allowed.

## Signing commits

Every contributor must [sign their commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits).

After configuring the signing key, commit using `git commit -s` or simply [configure your `.gitconfig` to do add the `-s` parameter automatically](https://github.com/zkorum/agora/blob/main/CONTRIBUTING.md#local-git-config-configuration).

## FLA

Every contributor must sign our iteration of the [Free Software Foundation Europe's Fiduciary Licensing Agreement](https://cla-assistant.io/zkorum/zkorum). Click on the link to sign it with your GitHub account.

What does it do? In short, it is a normalized contract that allows us to change the license of your code to any other OSI-approved and FSF-approved free and open-source license. You delegate to us the responsibility to defend against eventual license misuse. But it does NOT allow us to sell your GPL code under a proprietary license (dual licensing), like every other CLA does. The FLA is in use by large free software projects such as KDE for example.

More info are available on the [FSFE website](https://fsfe.org/activities/fla/fla.en.html).

## Git flow

Follow these steps:

- configure your local git config
- connect to GitHub
- fork the project to your personal account
- clone your fork to your computer
- create a feature branch (never push to main)
- create upstream remote locally
- do some work, commit and push on this feature branch
- open a DRAFT PR from this branch to upstream ZKorum main
- sync your fork main from upstream and rebase your feature branch from main before every new work session

Let's detail some of the steps.

### Local git config configuration

Follow this guide https://github.com/nicobao/personal-notebook/blob/main/002_git_github_config.md

In particular, you can use this `$HOME/.gitconfig` file as example: https://github.com/nicobao/setup/blob/master/.gitconfig#L25-L26

Configure your GPG/SSH key for signing your commits: https://github.com/nicobao/personal-notebook/blob/main/002_git_github_config.md#gpg-key-and-commit-verification

Don't forget to configure your `.gitconfig` to always sign commits: https://github.com/nicobao/setup/blob/master/.gitconfig#L4-L7

Making `pull` command perform a `rebase` by default instead of a `merge` is recommended for this repo, as we never do any merge: https://github.com/nicobao/setup/blob/master/.gitconfig#L25-L26

**IMPORTANT: configure your editor or choice for rebase/merge/conflicts:**

- example with neovim: https://github.com/nicobao/setup/blob/master/.gitconfig#L9-L15
- example with vscode: https://code.visualstudio.com/updates/v1_70#_3way-merge-editor-improvements

### Create a feature branch

```bash
cd <your_cloned_repo>
# Call the branch depending on the name of the corresponding GitHub issue you're working on - and the issue number
# This will create and checkout to the new feature branch
git checkout -b 11_my_feature_branch
```

### Create upstream remote locally

```bash
cd <your local fork>
# ssh or https links? configure your .gitconfig to always use ssh from https: see https://github.com/nicobao/setup/blob/master/.gitconfig#L22-L23
git remote add upstream git@github.com:zkorum/agora.git
```

### Open a DRAFT PR

Connect to GitHub, and visit the page of your fork.
A popup suggestion will appear after you've pushed some code in your feature branc. Click on it and choose "DRAFT PR". Source: `<your_fork/<your_branch>`, destination `upstream/main`. Default should be good already, no need to change it.

### Sync your fork's main from upstream's main

There are two ways of doing that.

#### From GitHub

Connect to GitHub, and visit the page of your fork. Just below the button "Code", click on "Sync fork", and "Update branch".

#### Locally

```bash
cd <your_local_fork>
git fetch upstream
git checkout main
git pull
git pull --rebase upstream main
# There should be no conflict and the above command should be a success, as you should never push to main directly.
git push --force-with-lease
```

### Rebase your branch

After syncing main with upstream, you can rebase your branch from your local main.

```bash
cd <your_local_fork>
# main is up to date with upstream/main and origin/main because of the syncing above
git checkout 11_my_feature_branch
# We assume this local branch is up to date with remote origin (everything committed and pushed)
# Note: you can't rebase if you have uncommitted changes locally. Do not stash them or when you will unstash them after the rebase, it might create conflicts. Just commit.
git rebase -i origin/main
# The above will open a screen on your editor of choice that you have configure earlier, so you can choose what to fixup/squash
# Fixup or squash everything (fixup is better imho) except the first commit to avoid solving the same conflict multiple times at each of your commits.
# Then save and close the window

# If there is no conflict, you'll get "Successfully rebased..." message already. If that's your case ignore the following sequence and skip to the last command
# Do the following two commands in sequence until you get to "Successfully rebased...." message:
git mergetool # will open your editor - solve conflict then save and quit window
git rebase --continue # if more conflict, do the sequence again, else move on to the last command
# End of sequence

# last command - only when you get to "Successfully rebase" message and you're happy with your eventual conflict resolution
# if you try "git push" alone, it will error out, and tell you to pull. DO NOT PULL. You must force push to origin because you just re-wrote history
git push --force-with-lease
```
