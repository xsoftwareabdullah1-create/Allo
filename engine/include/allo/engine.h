#pragma once
#include <stddef.h>
#include <stdint.h>

#if defined(_WIN32)
  #if defined(ALLO_ENGINE_BUILD)
    #define ALLO_API __declspec(dllexport)
  #else
    #define ALLO_API __declspec(dllimport)
  #endif
#else
  #define ALLO_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

#define ALLO_ENGINE_ABI_VERSION 1

typedef struct allo_engine_info {
  uint32_t abi_version;
  const char* name;
  const char* version;
  const char* state;
} allo_engine_info;

/* Returns immutable build/runtime metadata. */
ALLO_API const allo_engine_info* allo_engine_get_info(void);

/* Copies a diagnostic into out; returns required bytes including NUL. */
ALLO_API size_t allo_engine_diagnostic(char* out, size_t capacity);

#ifdef __cplusplus
}
#endif
