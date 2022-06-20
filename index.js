#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import nconf from 'nconf';

nconf.use('file', { file: './config.json' });

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
  let token = nconf.get('AUTO_GIT_TOKEN');

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
  nconf.set('AUTO_GIT_TOKEN', answer.token);
  nconf.save(function (err) {
    if (err) {
      console.error(err.message);
      return;
    }
  });

  return answer.token;
}

async function resetToken() {
  nconf.set('AUTO_GIT_TOKEN', '');
  nconf.save(function (err) {
    if (err) {
      console.error(err.message);
      return;
    }
  });
}

function execute(command, callback) {
  exec(command, function (error, stdout, stderr) {
    callback(stdout);
  });
}
