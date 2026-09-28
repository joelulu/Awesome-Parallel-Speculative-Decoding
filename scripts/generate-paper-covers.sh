#!/usr/bin/env bash
set -euo pipefail

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

render_cover() {
  local paper_id="$1"
  local arxiv_id="$2"
  local pdf="$work_dir/${paper_id}.pdf"
  local output="public/papers/${paper_id}"
  local pages

  curl --fail --location --silent --show-error --retry 3 --retry-all-errors \
    "https://arxiv.org/pdf/${arxiv_id}" --output "$pdf"
  if [[ "$(head -c 5 "$pdf")" != "%PDF-" ]]; then
    echo "arXiv returned a non-PDF response for ${arxiv_id}" >&2
    return 1
  fi

  pages="$(pdfinfo "$pdf" | sed -n 's/^Pages:[[:space:]]*//p')"
  if [[ ! "$pages" =~ ^[0-9]+$ ]] || (( pages < 1 )); then
    echo "Could not read the page count for arXiv:${arxiv_id}" >&2
    return 1
  fi

  pdftoppm -f 1 -l 1 -singlefile -jpeg -jpegopt quality=90 \
    -scale-to 1000 "$pdf" "$output"
  test -s "${output}.jpg"
  echo "Rendered ${output}.jpg from arXiv:${arxiv_id}, page 1 of ${pages}."
}

render_cover dpara 2609.27396
render_cover ncp-archpreview 2609.10715
