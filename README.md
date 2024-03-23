# Firebase Remote Config Actions

![GitHub Action](https://img.shields.io/badge/GitHub-Action-red.svg?style=flat&logo=github&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Remote%20Config-orange.svg?style=flat&logo=firebase)

<p align="center">
  <img src='images/logo.webp' width='400'>
</p>

Developed by [lirlia](https://github.com/lirlia), this GitHub Action facilitates
the management of Firebase Remote Config templates.

It allows for validating, publishing, and diffing Firebase Remote Config
templates within your GitHub workflows, seamlessly integrating Firebase Remote
Config updates into your development and CI/CD processes.

**Note**: Authentication for this action is exclusively supported through
**Workload Identity Federation**, enabling secure access to Google Cloud
resources from GitHub Actions without the need for service account keys.

## Features

- **Validate**: Ensure templates meet project and Firebase standards.
- **Publish**: Automatically deploy templates to Firebase.
- **Diff**: Compare local and published templates to review changes.

## Inputs

| Input                   | Description                                         | Required | Default    |
| ----------------------- | --------------------------------------------------- | -------- | ---------- |
| `command`               | The command to run (`validate`, `publish`, `diff`). | Yes      | `validate` |
| `template-file-path`    | Path to the template file.                          | Yes      |            |
| `service-account-email` | The service account email for authentication.       | Yes      |            |

## Outputs

| Output           | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `diff`           | The diff of the template. Available only when the command is `diff`.       |
| `is-valid`       | Indicates whether the template is valid. Available for `validate` command. |
| `invalid-reason` | The reason the template is invalid. Available for `validate` command.      |

### validate

The `validate` output provides information about the validity of the template.

```json
{
  "is-valid": false,
  "invalid-reason": "Remote Config parameters must be a non-null object"
}
```

> [!NOTE]
> This action does not fail even if the validate fails. Therefore, if you want to fail the job when validate fails, check the output of `is-valid` and `invalid-reason`.

```yaml
- id: validate
  uses: lirlia/firebase-remote-config-actions@main
  with:
    command: validate
    template-file-path: xxx
    service-account-email: xxx

- name: check validate is ok
  shell: bash
  run: |
    if [ "${{ steps.validate.outputs.is_valid }}" == "false" ]; then
      echo "Remote config validation failed"
      echo "${{ steps.validate.outputs.invalid-reason }}"
      exit 1
    fi
```

### diff

```diff
 {
   parameterGroups: {
     Feature Flags: {
       parameters: {
+        featureFlagA: {
+          defaultValue: {
+            value: "false"
+          }
+          conditionalValues: {
+            ios-1.0.0: {
+              value: "true"
+            }
+            android-1.0.0: {
+              value: "true"
+            }
+          }
+          valueType: "BOOLEAN"
+        }
         featureFlagB: {
-          conditionalValues: {
-            ios-0.1.0: {
-              value: "true"
-            }
-            android-0.1.0: {
-              value: "true"
-            }
-          }
           defaultValue: {
-            value: "false"
+            value: "true"
           }
         }
       }
     }
   }
   conditions: [
     {
-      name: "ios-0.1.0"
+      name: "ios-1.0.0"
-      expression: "app.id == 'xx' && app.version.>=(['0.1.0'])"
+      expression: "app.id == 'xx' && app.version.>=(['1.0.0'])"
     }
     {
-      name: "android-0.1.0"
+      name: "android-1.0.0"
-      expression: "app.id == 'xx' && app.version.>=(['0.1.0'])"
+      expression: "app.id == 'xx' && app.version.>=(['1.0.0'])"
     }
   ]
 }

```

> [!NOTE]
> This action does not post the diff to the output. If you want to use the diff, you need to use the output of the action.

```yaml
- id: diff
  uses: lirlia/firebase-remote-config-actions@main
  with:
    command: diff
    template-file-path: xxx
    service-account-email: xxx

- name: Comment PR
  uses: thollander/actions-comment-pull-request@main
  if: ${{ steps.diff.outputs.diff != '' }}
  with:
    message: |
      ## Remote Config Diff

      ```diff
      ${{ steps.diff.outputs.diff }}
      ```

    comment_tag: execution
```

## Example Usage

Here's an example of how to use this action in a workflow file:

```yaml
name: Manage Firebase Remote Config
on: [push]
jobs:
  firebase-remote-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          project_id: YOUR_PROJECT_ID
          workload_identity_provider: YOUR_PROVIDER
          # this flag must be set to true to create the credentials file
          # firebase actions require GOOGLE_APPLICATION_CREDENTIALS to be set
          create_credentials_file: true

      - name: Validate Firebase Remote Config
        uses: lirlia/firebase-remote-config-actions@main
        with:
          command: 'validate'
          # Please specify the absolute path.
          template-file-path: '${{ github.workspace }}/template.json'
          service-account-email: 'xxx@yyyy.iam.gserviceaccount.com'
```

## How to Use

1. Create a new service account in the Google Cloud Console.
2. Add the `Firebase Remote Config Admin` role to the service account.
3. Enable Workload Identity Federation for the service account.
   - see: [google-github-actions/auth: A GitHub Action for authenticating to Google Cloud.](https://github.com/google-github-actions/auth)
4. Add this action to your workflow file.

## Contributing

We welcome contributions! Feel free to make a pull request or open an issue for
suggestions or assistance.
