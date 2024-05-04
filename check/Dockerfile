FROM debian:bookworm-slim

SHELL [ "/bin/sh", "-e", "-c" ]

# hadolint ignore=DL3008
RUN <<EOF
apt-get update
apt-get install -y --no-install-recommends \
        ca-certificates git perl
rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
git clone https://github.com/lvc/abi-compliance-checker \
    /work/abi-compliance-checker --depth=1
EOF

COPY --chmod=755 <<'EOF' /work/entrypoint.sh
#!/bin/sh -eu

printf 'report=%s\n' "$OUTPUT_FILE" >> "$GITHUB_OUTPUT"
exec /work/abi-compliance-checker/abi-compliance-checker.pl $@
EOF

ENTRYPOINT [ "/work/entrypoint.sh" ]
