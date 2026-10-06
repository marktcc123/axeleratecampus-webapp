#!/usr/bin/env sh
# The install step for ANY keyless build environment, not just one host.
#
# npm always writes the `resolved` field of a GitHub dependency as git+ssh://
# however the spec is written — verified: an explicit git+https:// URL in
# package.json still normalises to ssh in the lockfile. github.com
# authenticates the *user* over SSH even for a public repo, and a build
# container has no key, so `npm ci` stops at "Installing dependencies" with
# Permission denied (publickey).
#
# axelerate-design-system is public, so nothing here needs a credential — only
# the protocol has to change. These two rewrites send git over anonymous HTTPS.
#
# This file used to be called vercel-install.sh, which read as host-specific.
# It is not: every platform that clones this repo into a container without an
# SSH key needs it. Point your host's install command at this script.
set -e

# --add on the second: insteadOf is multi-valued, and a plain `git config`
# replaces the key rather than appending, which silently drops the first
# rewrite and sends npm back over SSH.
git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
git config --global --add url."https://github.com/".insteadOf "git@github.com:"

npm ci
