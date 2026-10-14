# Security policy

Orbitarium is designed to run locally. Its important security properties are that it does not upload repository data, does not execute repository code, and does not expose the viewer beyond the configured host unless the operator explicitly changes that host.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private security advisory flow for the repository, or contact the maintainer privately through the GitHub profile associated with `grubbs-dev`.

Include the affected version, reproduction steps, impact, and a safe proposed fix if you have one.

## Safe operation

- Prefer the default `127.0.0.1` host.
- Treat generated reports as sensitive: they can reveal local repository names and paths.
- Do not serve a report or viewer on a network interface without understanding who can reach it.
- Do not run Orbitarium from an untrusted repository as an administrator.
