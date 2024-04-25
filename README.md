

## Quickbase Solution API update action

This is a GitHub action that uses the `Quickbase Solution API` to export a solution in Quickbase and create a Pull Request. The exported solution will be compared with the `qbl_filename` provided with the action inputs .
You can set your own steps in the workflow file to run the action.

## Prerequisites
1. Create a Quickbase user token by following the instructions [here](https://help.quickbase.com/api-guide/create_user_token.html).

2. Create a github token by following the instructions [here](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token).

3. Add those tokens to the repository secrets. See [here](https://docs.github.com/en/actions/reference/encrypted-secrets) for more information.

4. Set your repository to allow actions to run. See [here](https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions#permissions) for more information.

## Inputs

This action requires the following inputs:

- `gh_token`: Your GitHub token. This is required for authentication purposes.
- `owner_name`: The name of the repository owner. This is required.
- `owner_email`: The email of the repository owner. This is required.

#### Custom Repository Settings

- `pr_title`: The title of the Pull Request. By default, this is set to 'Export solution version'.
- `pr_description`: The description for the auto-created Pull Request. By default, this is set to 'See the difference between the old and new solution QBL'.
- `branch_name`: The name of the branch where the Pull Request will be created. By default, this is set to 'new-solution-version'.

#### Quickbase Solution (QBL) Settings

- `qb_user_token`: Your Quickbase user token. This is required for authentication purposes.
- `qb_realm`: The name of your Quickbase realm. This is required.
- `qbl_version`: The version of your Quickbase QBL. By default, this is set to '0.2'.
- `qbl_filename`: The filename for the QBL file that will be checked into the repository. By default, this is set to 'solution.yaml'.
- `qb_solution_id`: The ID of the solution that will be exported. This is required.

## Outputs

You can see the action result in the Actions tab in your repository. In case of an error, the action will fail and you can see the error message in the logs.

## Usage

```yaml
 - name: Export solution
        uses: ekaradzha-qb/solution-export-action@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          qb_user_token: ${{secrets.QB_USER_TOKEN}}
          qb_solution_id:  ${{vars.QB_SOLUTION_ID_TO_EXPORT}}
          qb_realm: ${{vars.QB_REALM}}
          owner_name: ${{vars.OWNER_NAME}}
          owner_email: ${{vars.OWNER_EMAIL}}
          qbl_version: ${{vars.QBL_VERSION}}
          qbl_filename: ${{vars.QBL_FILENAME}}
          pr_title: ${{vars.PR_TITLE}}
          branch_name: ${{vars.BRANCH_NAME}}
          pr_description: ${{vars.PR_DESCRIPTION}}
