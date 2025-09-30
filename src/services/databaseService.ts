/*
 * Thin wrapper around the in-memory SQLite database used to stage icon metadata.
 * Exposing high-level helpers keeps SQL isolated from the workflow module.
 */

import { Database } from 'bun:sqlite';

import type { IconData } from '@/types';

export function initDatabase(): Database {
  const db = new Database(':memory:');

  db.run(`
    CREATE TABLE icons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      style TEXT NOT NULL,
      body TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      viewBox TEXT NOT NULL,
      unicode TEXT,
      searchTerms TEXT,
      UNIQUE(name, style)
    );

    CREATE INDEX idx_icons_name ON icons(name);
    CREATE INDEX idx_icons_style ON icons(style);
    CREATE INDEX idx_icons_name_style ON icons(name, style);
  `);

  return db;
}

export function insertIcon(db: Database, iconData: IconData): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO icons (name, style, body, width, height, viewBox, unicode, searchTerms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    iconData.name,
    iconData.style,
    iconData.body,
    iconData.width,
    iconData.height,
    iconData.viewBox,
    iconData.unicode,
    JSON.stringify(iconData.searchTerms),
  );
}

export function getAvailableStyles(db: Database): string[] {
  const result = db.query('SELECT DISTINCT style FROM icons ORDER BY style').all() as { style: string }[];
  return result.map((row) => row.style);
}

export function getIconsByStyle(db: Database, style: string): IconData[] {
  const query = db.query('SELECT name, body, width, height, viewBox, unicode, searchTerms FROM icons WHERE style = ?');
  const rows = query.all(style) as Array<{
    name: string;
    body: string;
    width: number;
    height: number;
    viewBox: string;
    unicode: string;
    searchTerms: string;
  }>;

  return rows.map((row) => ({
    name: row.name,
    style,
    body: row.body,
    width: row.width,
    height: row.height,
    viewBox: row.viewBox,
    unicode: row.unicode,
    searchTerms: JSON.parse(row.searchTerms || '[]'),
  }));
}

export function searchIcons(db: Database, query: string, styles?: string[]): IconData[] {
  let sql = `
    SELECT * FROM icons
    WHERE (name LIKE ? OR searchTerms LIKE ?)
  `;
  const params: (string | string[])[] = [`%${query}%`, `%${query}%`];

  if (styles && styles.length > 0) {
    const placeholders = styles.map(() => '?').join(',');
    sql += ` AND style IN (${placeholders})`;
    params.push(...styles);
  }

  sql += ' ORDER BY name, style';

  const rows = db.query(sql).all(...(params as string[])) as Array<{
    name: string;
    style: string;
    body: string;
    width: number;
    height: number;
    viewBox: string;
    unicode: string;
    searchTerms: string;
  }>;

  return rows.map((row) => ({
    name: row.name,
    style: row.style,
    body: row.body,
    width: row.width,
    height: row.height,
    viewBox: row.viewBox,
    unicode: row.unicode,
    searchTerms: JSON.parse(row.searchTerms || '[]'),
  }));
}
