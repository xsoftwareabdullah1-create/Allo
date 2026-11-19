cmake_minimum_required(VERSION 3.20)
project(AlloEngine VERSION 0.1.0 LANGUAGES C CXX)

option(ALLO_BUILD_TESTS "Build Allo Engine contract tests" ON)
set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(allo_engine SHARED
  src/engine.cpp
  src/c_api.cpp
)
target_include_directories(allo_engine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_definitions(allo_engine PRIVATE ALLO_ENGINE_BUILD)
if(MSVC)
  target_compile_options(allo_engine PRIVATE /W4 /permissive-)
else()
  target_compile_options(allo_engine PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
set_target_properties(allo_engine PROPERTIES
  OUTPUT_NAME allo_engine
  VERSION ${PROJECT_VERSION}
  SOVERSION 0
)

if(ALLO_BUILD_TESTS)
  enable_testing()
  add_executable(allo_engine_contract_test tests/engine_contract_test.cpp)
  target_link_libraries(allo_engine_contract_test PRIVATE allo_engine)
  add_test(NAME engine_contract COMMAND allo_engine_contract_test)
endif()
