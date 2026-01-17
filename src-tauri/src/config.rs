use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct Config {
    pub search_paths: Vec<String>,
}
