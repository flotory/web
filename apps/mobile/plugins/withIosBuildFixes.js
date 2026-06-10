const { withPodfile } = require('@expo/config-plugins')

const RCT_USE_RN_DEP_OLD =
  "ENV['RCT_USE_RN_DEP'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true' && podfile_properties['newArchEnabled'] != 'false'"
const RCT_USE_PREBUILT_OLD =
  "ENV['RCT_USE_PREBUILT_RNCORE'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true' && podfile_properties['newArchEnabled'] != 'false'"
const RCT_USE_RN_DEP_NEW =
  "ENV['RCT_USE_RN_DEP'] ||= podfile_properties['ios.buildReactNativeFromSource'] == 'true' ? '0' : '1'"
const RCT_USE_PREBUILT_NEW =
  "ENV['RCT_USE_PREBUILT_RNCORE'] ||= podfile_properties['ios.buildReactNativeFromSource'] == 'true' ? '0' : '1'"

const FIX_MARKER = '# Flotory: Xcode 26+ native build fixes'
const XCODE_FIX = `
    ${FIX_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end

    installer.pods_project.targets.each do |target|
      next unless %w[fmt Yoga glog].include?(target.name)

      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        definitions = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        definitions = [definitions] unless definitions.is_a?(Array)
        definitions << 'FMT_USE_CONSTEVAL=0' unless definitions.include?('FMT_USE_CONSTEVAL=0')
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = definitions
      end
    end

    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('Flotory Xcode 26 workaround')
        patched = content.gsub(
          /# define FMT_USE_CONSTEVAL 1/,
          "// Flotory Xcode 26 workaround\\n# define FMT_USE_CONSTEVAL 0",
        )
        if patched != content
          File.chmod(0o644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end`

/** Keep legacy-arch iOS builds on prebuilt RN and patch Xcode 26 native build issues. */
function withIosBuildFixes(config) {
  return withPodfile(config, (mod) => {
    let contents = mod.modResults

    if (contents.includes(RCT_USE_RN_DEP_OLD)) {
      contents = contents.replace(RCT_USE_RN_DEP_OLD, RCT_USE_RN_DEP_NEW)
    }

    if (contents.includes(RCT_USE_PREBUILT_OLD)) {
      contents = contents.replace(RCT_USE_PREBUILT_OLD, RCT_USE_PREBUILT_NEW)
    }

    if (!contents.includes(FIX_MARKER)) {
      contents = contents.replace(
        /react_native_post_install\([\s\S]*?\)\n/,
        (match) => `${match}${XCODE_FIX}\n`,
      )
    }

    mod.modResults = contents
    return mod
  })
}

module.exports = withIosBuildFixes
