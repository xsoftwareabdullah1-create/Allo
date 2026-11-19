#include "allo/engine.hpp"

namespace allo {
const EngineInfo& engine_info() noexcept {
  static constexpr EngineInfo info{
      "Allo Native Engine", "0.1.0", "scaffold", 1};
  return info;
}

std::string_view diagnostic() noexcept {
  return "Native inference backend is not connected yet; this build exposes the stable engine ABI only.";
}
}  // namespace allo
