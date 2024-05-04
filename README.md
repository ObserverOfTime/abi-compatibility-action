# ABI compatibility action

This repository contains three actions that can be
used to check the backward compatibility of an ABI.

## Usage

See the `action.yml` files for details.

### Example workflow

This is a more complicated version of the workflow used in [tree-sitter].

```yaml
name: Check ABI changes

on:
  push:
    branches: [master]
    paths:
      - lib/src/**
      - lib/include/**
  pull_request:
    branches: [master]
    paths:
      - lib/src/**
      - lib/include/**

concurrency:
  group: ${{github.workflow}}-${{github.ref}}
  cancel-in-progress: true

env:
  OLD_SHA: ${{github.event.pull_request.base.sha || github.event.before}}
  NEW_SHA: ${{github.event.pull_request.head.sha || github.event.after}}

jobs:
  dump:
    name: Dump ${{matrix.version}} ABI data
    runs-on: ubuntu-latest
    strategy:
      fail-fast: true
      matrix:
        version: [old, new]
        include:
          - { version: old, ref: "${{env.OLD_SHA}}" }
          - { version: new, ref: "${{env.NEW_SHA}}" }
    steps:
      - name: Checkout ${{matrix.version}} commit
        uses: actions/checkout@v4
        with:
          ref: ${{matrix.ref}}
          sparse-checkout: |
            lib/src/
            lib/include/
      - name: Compile library
        run: make libtree-sitter.so
        env:
          CFLAGS: -Og -g -fno-omit-frame-pointer
      - name: Run ABI dumper
        id: abi-dumper
        uses: ObserverOfTime/abi-compatibility-action/dump@v1
        with:
          library: libtree-sitter.so
          version: ${{matrix.ref}}
          args: -public-headers lib/include
      - name: Upload dump artifact
        uses: actions/upload-artifact@v4
        with:
          name: abi-dump-${{matrix.version}}
          path: ${{steps.abi-dumper.outputs.dump}}
          retention-days: 1

  check:
    name: Check ABI compatibility
    runs-on: ubuntu-latest
    needs: [dump]
    outputs:
      report: ${{steps.process.outputs.report}}
    steps:
      - name: Download dump artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: abi-dump-*
      - name: Run ABI compliance checker
        id: abicc
        uses: ObserverOfTime/abi-compatibility-action/check@v1
        continue-on-error: true
        with:
          old-dump: abi-dump-old/ABI.dump
          new-dump: abi-dump-new/ABI.dump
          old-version: ${{env.OLD_SHA}}
          new-version: ${{env.NEW_SHA}}
          args: -check-private-abi
      - name: Post-process HTML report
        id: process
        uses: ObserverOfTime/abi-compatibility-action/process@v1
        with:
          report: ${{steps.abicc.outputs.report}}

  comment-pr:
    name: Comment on PR
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [check]
    steps:
      - name: Find comment
        id: find-comment
        uses: peter-evans/find-comment@v3
        with:
          issue-number: ${{github.event.pull_request.number}}
          comment-author: github-actions[bot]
          body-includes: ABI compatibility report
      - name: Create or update comment
        uses: peter-evans/create-or-update-comment@v4
        with:
          comment-id: ${{steps.find-comment.outputs.comment-id}}
          issue-number: ${{github.event.pull_request.number}}
          body: ${{needs.check.outputs.report}}
          edit-mode: replace

  comment-push:
    name: Comment on commit
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    needs: [check]
    steps:
      - name: Create commit comment
        uses: peter-evans/commit-comment@v3
        with:
          body: ${{needs.check.outputs.report}}
```

[tree-sitter]: https://github.com/tree-sitter/tree-sitter
