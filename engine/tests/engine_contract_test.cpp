#include "allo/engine.h"
#include <cassert>
#include <cstring>

int main() {
  const auto* info = allo_engine_get_info();
  assert(info != nullptr);
  assert(info->abi_version == ALLO_ENGINE_ABI_VERSION);
  assert(std::strcmp(info->name, "Allo Native Engine") == 0);
  char message[256]{};
  const auto required = allo_engine_diagnostic(message, sizeof(message));
  assert(required > 1);
  assert(message[0] != '\0');
  return 0;
}
