use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern {
    pub fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("I say: {}", name));
}

#[wasm_bindgen]
pub fn change(name: &str) -> JsValue {
    JsValue::from_str(&format!("Hellooo, {}!", name))
}
