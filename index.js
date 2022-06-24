#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import keytar from 'keytar';

let repo_name;
let is_repo_pvt;

const token = await getToken();
await ask();

const octokit = new Octokit({ auth: token });
try {
  const res = await octokit.rest.repos.createForAuthenticatedUser({
    name: repo_name,
    private: is_repo_pvt,
  });
  const repository_fullname = res.data.full_name;

  execute('git init', () => {
    execute('git add .', () => {
      execute('git commit -m "first commit"', () => {
        execute('git branch -M main', () => {
          execute(
            `git remote add origin https://github.com/${repository_fullname}.git`,
            () => {
              execute('git push -u origin main', () => {
                console.log(chalk.blueBright('Successful :)'));
              });
            }
          );
        });
      });
    });
  });
} catch (error) {
  console.log(chalk.redBright(error.response.data.message));
  if (
    error.response.data.message == 'Bad credentials' ||
    error.response.data.message == 'Requires authentication' ||
    error.response.data.message == 'Not Found'
  ) {
    await resetToken();
  }
}

async function ask() {
  const answer = await inquirer.prompt([
    {
      name: 'repo_name',
      type: 'input',
      message: chalk.blueBright('Repository name:'),
    },
    {
      name: 'is_repo_pvt',
      type: 'confirm',
      default: true,
      message: chalk.blueBright('Do you want to keep your repository private?'),
    },
  ]);
  repo_name = answer.repo_name;
  is_repo_pvt = answer.is_repo_pvt;
}

async function getToken() {
  let token = await keytar.getPassword('git_auto', 'AUTO_GIT_TOKEN');
  console.log(token);

  if (!token) {
    token = await saveToken();
  }

  return token;
}

async function saveToken() {
  const answer = await inquirer.prompt([
    {
      name: 'token',
      type: 'input',
      message: chalk.blueBright('Git Personal Access Tokens:'),
    },
  ]);
  try {
    await keytar.setPassword('git_auto', 'AUTO_GIT_TOKEN', 'hihihi');
  } catch (error) {
    console.log(error);
  }
  return answer.token;
}

async function resetToken() {
  await keytar.deletePassword('git_auto', 'AUTO_GIT_TOKEN');
}

function execute(command, callback) {
  exec(command, function (error, stdout, stderr) {
    callback(stdout);
  });
}
