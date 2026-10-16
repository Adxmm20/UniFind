"use client";

import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Toolbar,
} from "@mui/material";
import { useState } from "react";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
          <Box component="div" sx={{ fontSize: "1.25rem", fontWeight: 700 }}>
            UniFind
          </Box>

          <Box
            component="div"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <TextField
              size="small"
              placeholder="Search"
              slotProps={{
                htmlInput: { "aria-label": "Search" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">⌕</InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: 160, sm: 280 } }}
            />
            <IconButton
              color="inherit"
              aria-label="Open navigation drawer"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box
          role="presentation"
          sx={{ width: 240 }}
          onClick={() => setDrawerOpen(false)}
          onKeyDown={() => setDrawerOpen(false)}
        >
          <List>
            {["Home", "Universities", "Saved"].map((item) => (
              <ListItem key={item} disablePadding>
                <ListItemButton>
                  <ListItemText primary={item} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
