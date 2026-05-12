# Longhorn UI Extension

Rancher UI Extension for [Longhorn](https://longhorn.io) — Cloud-native distributed block storage for Kubernetes.

This extension provides a comprehensive management interface for Longhorn volumes, nodes, and storage resources directly within the Rancher dashboard.

## Quick Start

```bash
git clone https://github.com/rancher/longhorn-ui-extension.git
cd longhorn-ui-extension
yarn install
```

## Development

### Starting Development Server

```bash
# Rancher backend URL (local or remote)
API=https://<rancher-host> yarn dev
```

Access the extension at `https://localhost:8005`.

### Environment Variables

| Variable | Required | Default | Description             |
| -------- | -------- | ------- | ----------------------- |
| `API`    | Yes      | —       | Rancher backend URL     |
| `PORT`   | No       | `8005`  | Development server port |

## Building

### Development Build

```bash
yarn build
```

### Production Package Build

```bash
yarn build-pkg longhorn
# Output: dist-pkg/longhorn-0.1.0/
```

### Publishing

```bash
yarn serve-pkgs        # Serve built packages locally
yarn publish-pkgs      # Publish to repository
```

## Development Standards

- Pre-commit checks are enforced with [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages.
- Recommended local validation before opening a pull request:

```bash
yarn lint:fix
yarn build
```

## Contributing

Contributions are welcome! Please follow the [Longhorn contributing guidelines](https://github.com/longhorn/longhorn#community).

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes following the code style guidelines
4. Commit with conventional commit format
5. Push to your fork
6. Open a pull request with detailed description

## License

Copyright (c) 2024 The Longhorn Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Resources

- **Website**: https://longhorn.io
- **Documentation**: https://longhorn.io/docs/
- **GitHub**: https://github.com/longhorn/longhorn
- **Rancher Dahboard**: https://github.com/rancher/dashboard
