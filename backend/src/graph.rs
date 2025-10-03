use std::collections::{HashMap, HashSet};

/// Represents a directed graph for cycle detection
pub struct DirectedGraph {
    /// Adjacency list: node -> set of nodes it points to
    edges: HashMap<String, HashSet<String>>,
}

impl DirectedGraph {
    pub fn new() -> Self {
        Self {
            edges: HashMap::new(),
        }
    }

    /// Add an edge from source to target
    pub fn add_edge(&mut self, from: String, to: String) {
        self.edges
            .entry(from)
            .or_insert_with(HashSet::new)
            .insert(to);
    }

    /// Add multiple edges (from each 'from' node to each 'to' node)
    pub fn add_edges(&mut self, from_nodes: &[String], to_nodes: &[String]) {
        for from in from_nodes {
            for to in to_nodes {
                self.add_edge(from.clone(), to.clone());
            }
        }
    }

    /// Check if the graph contains a cycle using DFS
    pub fn has_cycle(&self) -> bool {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        for node in self.edges.keys() {
            if !visited.contains(node) {
                if self.dfs_has_cycle(node, &mut visited, &mut rec_stack) {
                    return true;
                }
            }
        }

        false
    }

    fn dfs_has_cycle(
        &self,
        node: &str,
        visited: &mut HashSet<String>,
        rec_stack: &mut HashSet<String>,
    ) -> bool {
        visited.insert(node.to_string());
        rec_stack.insert(node.to_string());

        if let Some(neighbors) = self.edges.get(node) {
            for neighbor in neighbors {
                if !visited.contains(neighbor) {
                    if self.dfs_has_cycle(neighbor, visited, rec_stack) {
                        return true;
                    }
                } else if rec_stack.contains(neighbor) {
                    // Back edge found - cycle detected
                    return true;
                }
            }
        }

        rec_stack.remove(node);
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_cycle() {
        let mut graph = DirectedGraph::new();
        graph.add_edge("A".to_string(), "B".to_string());
        graph.add_edge("B".to_string(), "C".to_string());
        assert!(!graph.has_cycle());
    }

    #[test]
    fn test_simple_cycle() {
        let mut graph = DirectedGraph::new();
        graph.add_edge("A".to_string(), "B".to_string());
        graph.add_edge("B".to_string(), "A".to_string());
        assert!(graph.has_cycle());
    }

    #[test]
    fn test_complex_cycle() {
        let mut graph = DirectedGraph::new();
        graph.add_edge("A".to_string(), "B".to_string());
        graph.add_edge("B".to_string(), "C".to_string());
        graph.add_edge("C".to_string(), "A".to_string()); // Cycle
        assert!(graph.has_cycle());
    }
}
