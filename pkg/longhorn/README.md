# Longhorn

**Operate Longhorn storage with speed and confidence from within Rancher.**

### Overview

The Longhorn extension brings storage operations into the Rancher experience, giving platform teams a unified place to monitor, manage, and maintain Longhorn resources.

Documentation for Longhorn can be found [here](https://longhorn.io/docs/).

### Core Architecture

Built on Rancher UI Extensions APIs, this extension maps Longhorn models, edit flows, and detail views directly into Rancher navigation. It is designed for existing Longhorn deployments and focuses on day-2 operations, not Longhorn installation.

### Key Technical Features

- **Unified Storage Operations**: Manage the full volume lifecycle, including create, inspect, expand, and delete actions, without leaving Rancher.
- **Data Protection Visibility**: Access snapshot and backup views from a single operational surface.
- **Infrastructure Awareness**: Track Longhorn node and disk capacity and health to make safer storage decisions.
- **Operational Controls**: Work with recurring jobs and engine image management through dedicated Longhorn workflows.

### Target Use Cases

- **Platform Operations Teams**: Standardize Longhorn administration in Rancher for faster, more consistent day-to-day operations.
- **Multi-Cluster Environments**: Apply the same storage management experience across clusters where Longhorn is deployed.

### Deployment Path

- **Prerequisites**: Rancher >= v2.14.0; UI Extensions API >= 3.0.0 and < 4.0.0; Longhorn installed in the target cluster.
- **First Step**: Install the Longhorn extension in Rancher, then open the Longhorn pages to start operating existing storage resources.

### Support

- Longhorn documentation: https://longhorn.io/docs/
- Issues and feature requests: https://github.com/rancher/longhorn-ui-extension/issues
