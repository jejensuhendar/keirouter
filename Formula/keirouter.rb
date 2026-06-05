# Auto-updated by release.yml on tag v0.1.5. Do not edit manually.
class Keirouter < Formula
  desc "AI API router — unified gateway for 20+ LLM providers with fallback, caching, and dashboard"
  homepage "https://github.com/mydisha/keirouter"
  version "0.1.5"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.5/keirouter_v0.1.5_darwin_arm64.tar.gz"
      sha256 "b6e9c5a0214038b0d02e5b57d8afc676ec13428e4eb2ce3e410233d65babc1d3"
    else
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.5/keirouter_v0.1.5_darwin_amd64.tar.gz"
      sha256 "d9e87fb8646f1d1d26a77a43c5523f555fc061d1482c6433b4afbae9b9cc47bf"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.5/keirouter_v0.1.5_linux_arm64.tar.gz"
      sha256 "7e85334ef0786f3ed7d23a3d3b113f354b1a4bedfeb720ce3d7fa2c8f7db0e38"
    else
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.5/keirouter_v0.1.5_linux_amd64.tar.gz"
      sha256 "a0174c3dcba8e76a2a5836d8d512af5e3e98d4a5e22710bf0ebdfe3f19f5cdbc"
    end
  end

  def install
    bin.install "keirouter"
    (share/"keirouter").install "frontend"
  end

  def caveats
    <<~EOS
      Quick start:
        keirouter -bootstrap    # create your first API key
        keirouter               # start server on :20180

      Dashboard: http://localhost:20180  (default password: keirouter)
    EOS
  end

  test do
    assert_match "KeiRouter", shell_output("\#{bin}/keirouter --help 2>&1", 2)
  end
end
