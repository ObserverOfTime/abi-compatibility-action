FROM debian:bookworm-slim

SHELL [ "/bin/sh", "-e", "-c" ]

# hadolint ignore=DL3008
RUN <<EOF
apt-get update
apt-get install -y --no-install-recommends \
        binutils \
        ca-certificates \
        elfutils \
        gcc \
        git \
        make \
        libelf-dev \
        libstdc++-12-dev \
        perl \
        universal-ctags
rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
git clone https://github.com/lvc/vtable-dumper \
    /work/vtable-dumper --depth=1
make -C /work/vtable-dumper all install PREFIX=/usr
git clone https://github.com/lvc/abi-dumper \
    /work/abi-dumper --depth=1
EOF

COPY --chmod=755 <<'EOF' /work/entrypoint.sh
#!/bin/sh -eu

printf 'dump=%s\n' "$OUTPUT_FILE" >> "$GITHUB_OUTPUT"
exec /work/abi-dumper/abi-dumper.pl $@
EOF

ENTRYPOINT [ "/work/entrypoint.sh" ]
