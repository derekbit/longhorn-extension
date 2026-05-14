# Longhorn

Rancher extension for managing Longhorn storage resources from the Rancher UI.

This extension adds Longhorn-focused pages and actions so operators can manage storage workflows without leaving Rancher.

## What This Extension Adds

- Volume lifecycle operations (create, inspect, expand, delete)
- Snapshot and backup related views
- Node and disk capacity and health visibility for Longhorn resources
- Recurring job and engine image management entry points

## Prerequisites

- Rancher: >= v2.14.0
- UI Extensions API: >= 3.0.0 and < 4.0.0
- Longhorn installed in the target cluster

Note: This extension does not install Longhorn itself. It provides UI and management flows for existing Longhorn deployments.

## Should I Install This?

Install this extension if you operate Longhorn and want to manage it in Rancher UI.

You can skip this extension if Longhorn is not part of your storage stack.

## Support

- Longhorn documentation: https://longhorn.io/docs/
- Issues and feature requests: https://github.com/rancher/longhorn-ui-extension/issues
