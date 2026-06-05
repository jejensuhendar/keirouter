# Auto-updated by release.yml on tag v0.1.4. Do not edit manually.
class Keirouter < Formula
  desc "AI API router — unified gateway for 20+ LLM providers with fallback, caching, and dashboard"
  homepage "https://github.com/mydisha/keirouter"
  version "0.1.4"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.4/keirouter_v0.1.4_darwin_arm64.tar.gz"
      sha256 "3edfccd27e7a2f8e954b7de5820f917a945a25161fa580544d461550b9c8157d"
    else
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.4/keirouter_v0.1.4_darwin_amd64.tar.gz"
      sha256 "cc699b93ea9dd71dc43d088de043af255bb105c014da5bd4c56aee8a98116a5d"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.4/keirouter_v0.1.4_linux_arm64.tar.gz"
      sha256 "6474fd0e632899fabb11cd0fb0791ba78febed911228fc1d71c803e46b7a95b3"
    else
      url "https://github.com/mydisha/keirouter/releases/download/v0.1.4/keirouter_v0.1.4_linux_amd64.tar.gz"
      sha256 "733cbad1e8e2d78256a8f9902f1dbaee9c8f7bdbb3b870c8a691ccda597b6032"
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
