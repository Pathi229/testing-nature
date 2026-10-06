Pod::Spec.new do |s|
  s.name = 'WildfolioVision'
  s.version = '0.1.0'
  s.summary = 'Private on-device foreground cutouts and image clues for Wildfolio'
  s.description = 'Local Expo module using Apple Vision. No network services.'
  s.author = 'Wildfolio'
  s.homepage = 'https://github.com/Pathi229/testing-nature'
  s.license = { :type => 'MIT' }
  s.source = { :git => 'https://github.com/Pathi229/testing-nature.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'CoreImage', 'ImageIO', 'UniformTypeIdentifiers'
  s.source_files = '**/*.{h,m,mm,swift}'
end
