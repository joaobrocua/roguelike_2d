// Sem janela de console no Windows (versão final)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  ruinas_esquecidas_lib::run();
}
