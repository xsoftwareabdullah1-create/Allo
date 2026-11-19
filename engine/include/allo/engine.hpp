#pragma once
#include <string_view>

namespace allo {
struct EngineInfo {
  std::string_view name;
  std::string_view version;
  std::string_view state;
  unsigned abi;
};

const EngineInfo& engine_info() noexcept;
std::string_view diagnostic() noexcept;
}  // namespace allo
