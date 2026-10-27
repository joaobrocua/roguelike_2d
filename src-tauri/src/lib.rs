use tauri::{WebviewUrl, WebviewWindowBuilder};

/// F11 liga e desliga a tela cheia (o navegador embutido não faz isso sozinho).
const FULLSCREEN_SCRIPT: &str = r#"
window.addEventListener('keydown', (event) => {
  if (event.key !== 'F11') return;
  event.preventDefault();
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});
"#;

/// A tela do jogo tem 480x270 (16:9): a janela abre no dobro, 960x540.
const WINDOW_SIZE: (f64, f64) = (960.0, 540.0);
const WINDOW_MIN_SIZE: (f64, f64) = (480.0, 270.0);

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("Ruínas Esquecidas")
        .inner_size(WINDOW_SIZE.0, WINDOW_SIZE.1)
        .min_inner_size(WINDOW_MIN_SIZE.0, WINDOW_MIN_SIZE.1)
        .initialization_script(FULLSCREEN_SCRIPT)
        .build()?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("erro ao abrir o jogo");
}
