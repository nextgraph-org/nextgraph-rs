import SwiftRs
import Tauri
import UIKit
import WebKit

class PingArgs: Decodable {
  let value: String?
}

class ExamplePlugin: Plugin {
  @objc public func import_contacts(_ invoke: Invoke) throws {
    //let args = try invoke.parseArgs(PingArgs.self)
    //invoke.resolve(["value": ""])
  }
  @objc public func check_permissions(_ invoke: Invoke) throws {
    //let args = try invoke.parseArgs(PingArgs.self)
    //invoke.resolve(["value": ""])
  }
  @objc public func request_permissions(_ invoke: Invoke) throws {
    //let args = try invoke.parseArgs(PingArgs.self)
    //invoke.resolve(["value": ""])
  }
}

@_cdecl("init_plugin_contacts_importer")
func initPlugin() -> Plugin {
  return ExamplePlugin()
}
