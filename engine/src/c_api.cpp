#include "allo/engine.h"
#include "allo/engine.hpp"
#include <algorithm>
#include <cstring>

extern "C" {
const allo_engine_info* allo_engine_get_info(void) {
  static const allo_engine_info info{
      ALLO_ENGINE_ABI_VERSION, "Allo Native Engine", "0.1.0", "scaffold"};
  return &info;
}

size_t allo_engine_diagnostic(char* out, size_t capacity) {
  const auto message = allo::diagnostic();
  const size_t required = message.size() + 1;
  if (out && capacity > 0) {
    const size_t copied = std::min(message.size(), capacity - 1);
    std::memcpy(out, message.data(), copied);
    out[copied] = '\0';
  }
  return required;
}
}
