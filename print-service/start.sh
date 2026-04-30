#!/bin/bash
# SkyTrack Print Service başlat
# Kullanım: ./start.sh

cd "$(dirname "$0")"

export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlNWE1YmIwZC1iNjk3LTQ0YzAtYjdmZC04ZjI2NTc3ZGFlMDEiLCJyb2xlIjoiQURNSU4iLCJwaWxvdElkIjpudWxsLCJwdiI6IlBoTFhmcWkyIiwiaWF0IjoxNzc2OTU2OTcxLCJleHAiOjE3Nzk1NDg5NzF9.s_4GTO9qM14vrB9LYh939-NkxCMyEC9xsf4cloXVLGE"
export SOCKET_URL="https://api.skytrackyp.com"

node index.js
