import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemoryCluster, MemoryChild, MemoryLeaf } from '../types';

export function useDynamicData() {
  const [loading, setLoading] = useState(true);
  const [aboutLines, setAboutLines] = useState<string[]>([]);
  const [memoryClusters, setMemoryClusters] = useState<MemoryCluster[]>([]);
  const [memoryLeafMap, setMemoryLeafMap] = useState<Record<string, MemoryChild>>({});
  const [leafTagMap, setLeafTagMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch About Lines
        const { data: aboutData } = await supabase
          .from('about_lines')
          .select('text')
          .order('display_order', { ascending: true });
        
        if (aboutData) {
          setAboutLines(aboutData.map(row => row.text));
        }

        // Fetch Memory Data
        const [
          { data: clustersData },
          { data: groupsData },
          { data: leavesData }
        ] = await Promise.all([
          supabase.from('memory_clusters').select('*').order('display_order', { ascending: true }),
          supabase.from('memory_groups').select('*').order('display_order', { ascending: true }),
          supabase.from('memory_leaves').select('*').order('display_order', { ascending: true })
        ]);

        if (clustersData && groupsData && leavesData) {
          const finalClusters: MemoryCluster[] = clustersData.map(cluster => {
            const clusterGroups = groupsData.filter(g => g.cluster_id === cluster.id);
            const clusterLeaves = leavesData.filter(l => l.cluster_id === cluster.id);

            const children: MemoryChild[] = [];

            // Add groups and their leaves
            clusterGroups.forEach(group => {
              const groupLeavesData = clusterLeaves.filter(l => l.group_id === group.id);
              const groupLeaves: MemoryLeaf[] = groupLeavesData.map(l => ({
                kind: 'leaf',
                id: l.id,
                label: l.label,
                content: {
                  title: l.content_title,
                  lines: l.content_lines as string[]
                }
              }));

              children.push({
                kind: 'group',
                id: group.id,
                label: group.label,
                detail: group.detail,
                children: groupLeaves
              });
            });

            // Add direct leaves
            const directLeavesData = clusterLeaves.filter(l => !l.group_id);
            directLeavesData.forEach(l => {
              children.push({
                kind: 'leaf',
                id: l.id,
                label: l.label,
                content: {
                  title: l.content_title,
                  lines: l.content_lines as string[]
                }
              });
            });

            return {
              id: cluster.id,
              label: cluster.label,
              detail: cluster.detail,
              children
            };
          });

          setMemoryClusters(finalClusters);

          // Build Maps
          const accurateMap: Record<string, MemoryChild> = {};
          const accurateTags: Record<string, string> = {};

          finalClusters.forEach(cluster => {
            cluster.children.forEach(child => {
              if (child.kind === 'group') {
                const walk = (children: MemoryChild[]) => {
                   for (const c of children) {
                     if (c.kind === 'group') walk(c.children);
                     else accurateMap[c.id] = c;
                   }
                };
                walk(child.children);
                
                child.children.forEach(leaf => {
                  accurateTags[leaf.id] = child.label;
                });
              } else {
                accurateMap[child.id] = child;
                accurateTags[child.id] = cluster.label;
              }
            });
          });

          setMemoryLeafMap(accurateMap);
          setLeafTagMap(accurateTags);
        }

      } catch (error) {
        console.error("Error fetching dynamic data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { loading, aboutLines, memoryClusters, memoryLeafMap, leafTagMap };
}
