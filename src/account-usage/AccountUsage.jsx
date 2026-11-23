import React, { useEffect, useId, useRef, useState } from 'react'

const assets = {
  imgEllipse12: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjguMTE2ODciIGhlaWdodD0iNS4wOTE5NSIgdmlld0JveD0iMCAwIDguMTE2ODcgNS4wOTE5NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggaWQ9IkVsbGlwc2UgMTIiIGQ9Ik0wLjc1IDQuMzQxOTVDMi41NjE4NyAyLjUzMDA4IDQuODYwMjQgMS4yODI0NCA3LjM2NjcxIDAuNzUwMTU0IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2U9IiMxOTFEMjUiIHN0cm9rZS1vcGFjaXR5PSIwLjQ1Ii8+Cjwvc3ZnPgo=',
  imgEllipse9: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjIwLjIzODMiIGhlaWdodD0iNS4zODA4NCIgdmlld0JveD0iMCAwIDIwLjIzODMgNS4zODA4NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggaWQ9IkVsbGlwc2UgOSIgZD0iTTAuNzUgNC42MzA4NEMzLjIzNDg2IDIuMTQ1OTggNi42MDUwNSAwLjc1IDEwLjExOTIgMC43NUMxMy42MzMzIDAuNzUgMTcuMDAzNSAyLjE0NTk4IDE5LjQ4ODMgNC42MzA4MyIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlPSIjMTkxRDI1IiBzdHJva2Utb3BhY2l0eT0iMC4xNSIvPgo8L3N2Zz4K',
  imgFigureStepfun: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJmaWd1cmUvc3RlcGZ1biI+CjxnIGlkPSJiZyI+CjwvZz4KPC9nPgo8L3N2Zz4K',
  imgFigureStepfun1: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjIyIiBoZWlnaHQ9IjIyIiB2aWV3Qm94PSIwIDAgMjIgMjIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJmaWd1cmUvc3RlcGZ1biI+CjxjaXJjbGUgaWQ9ImJnIiBjeD0iMTEiIGN5PSIxMSIgcj0iMTEiIGZpbGw9IiMxOTFEMjUiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPgo8L2c+Cjwvc3ZnPgo=',
  imgFigureStepfun2: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiB2aWV3Qm94PSIwIDAgMjggMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJmaWd1cmUvc3RlcGZ1biI+CjxjaXJjbGUgaWQ9ImJnIiBjeD0iMTQiIGN5PSIxNCIgcj0iMTQiIGZpbGw9IiMxOTFEMjUiLz4KPC9nPgo8L3N2Zz4K',
  imgIconCopy: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiB2aWV3Qm94PSIwIDAgMTAgMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uL2NvcHkiIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8wXzg5NikiPgo8ZyBpZD0iVmVjdG9yIj4KPHBhdGggZD0iTTcuOTI2MDMgMi45MTEzOEM4LjU0MDg2IDIuOTExNSA5LjAzOTYxIDMuNDA5ODIgOS4wMzk3MSA0LjAyNDY2VjcuOTI2MDNDOS4wMzk2MiA4LjU0MDg4IDguNTQwODcgOS4wMzk2IDcuOTI2MDMgOS4wMzk3MUg0LjAyNDY2QzMuNDA5OCA5LjAzOTYxIDIuOTExNDcgOC41NDA4OCAyLjkxMTM4IDcuOTI2MDNWNC4wMjQ2NkMyLjkxMTQ4IDMuNDA5ODEgMy40MDk4MSAyLjkxMTQ4IDQuMDI0NjYgMi45MTEzOEg3LjkyNjAzWk00LjAyNDY2IDMuNTc3ODhDMy43NzggMy41Nzc5OSAzLjU3Nzk5IDMuNzc4IDMuNTc3ODggNC4wMjQ2NlY3LjkyNjAzQzMuNTc3OTggOC4xNzI2OSAzLjc3Nzk5IDguMzcyNyA0LjAyNDY2IDguMzcyOEg3LjkyNjAzQzguMTcyNjggOC4zNzI2OCA4LjM3MjcxIDguMTcyNjkgOC4zNzI4IDcuOTI2MDNWNC4wMjQ2NkM4LjM3MjcgMy43NzgwMSA4LjE3MjY3IDMuNTc4IDcuOTI2MDMgMy41Nzc4OEg0LjAyNDY2WiIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMxOTFEMjUiIGZpbGwtb3BhY2l0eT0iMC4zIi8+CjxwYXRoIGQ9Ik01Ljk3NTM0IDAuOTYwNjkzQzYuNTg4NDggMC45NjA3MTMgNy4wODg5MiAxLjQ2MDg2IDcuMDg5MDMgMi4wNzM5N0M3LjA4OTAyIDIuMjU4MDYgNi45Mzk0NiAyLjQwNzYzIDYuNzU1MzcgMi40MDc2M0M2LjU3MTM3IDIuNDA3NTQgNi40MjIxMyAyLjI1OCA2LjQyMjEyIDIuMDczOTdDNi40MjIwMSAxLjgyOTA1IDYuMjIwMjkgMS42MjcyMiA1Ljk3NTM0IDEuNjI3MkgyLjA3Mzk3QzEuODI5MTEgMS42MjczMiAxLjYyNzMxIDEuODI5MTEgMS42MjcyIDIuMDczOTdWNS45NzUzNEMxLjYyNzIzIDYuMjIwMjcgMS44MjkwNiA2LjQyMiAyLjA3Mzk3IDYuNDIyMTJDMi4yNTgwMiA2LjQyMjEyIDIuNDA3NTUgNi41NzEzNSAyLjQwNzYzIDYuNzU1MzdDMi40MDc2MiA2LjkzOTQ2IDIuMjU4MDYgNy4wODkwMyAyLjA3Mzk3IDcuMDg5MDNDMS40NjA4NyA3LjA4ODkxIDAuOTYwNzI2IDYuNTg4NDYgMC45NjA2OTMgNS45NzUzNFYyLjA3Mzk3QzAuOTYwODAxIDEuNDYwOTIgMS40NjA5MiAwLjk2MDgxMiAyLjA3Mzk3IDAuOTYwNjkzSDUuOTc1MzRaIiBmaWxsPSIjMTkxRDI1IiBmaWxsLW9wYWNpdHk9IjAuMyIvPgo8L2c+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMF84OTYiPgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==',
  imgIconDownload: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uL2Rvd25sb2FkIj4KPHBhdGggaWQ9IlZlY3RvciIgZD0iTTIuMDAwMDEgOS45OTg0MVY5Ljg2NTYxQzIuMDAwMDEgOS41NzE4NSAyLjIzODIyIDkuMzMzNjEgMi41MzIwNCA5LjMzMzYxQzIuODI1ODUgOS4zMzM2MSAzLjA2NDA3IDkuNTcxODUgMy4wNjQwNyA5Ljg2NTYxVjkuOTk4NDFDMy4wNjQwNyAxMC41NjcxIDMuMDY0OCAxMC45NjE5IDMuMDg5ODUgMTEuMjY4N0MzLjExNDQgMTEuNTY5MiAzLjE1OTg2IDExLjczODQgMy4yMjQyMyAxMS44NjQ4TDMuMjgwNDggMTEuOTY2NEMzLjQyMTUzIDEyLjE5NjMgMy42MjM5NCAxMi4zODM4IDMuODY1NjMgMTIuNTA3TDMuOTY5NTQgMTIuNTUxNUM0LjA4NDU2IDEyLjU5MjcgNC4yMzYxNyAxMi42MjMgNC40NjE3MyAxMi42NDE0QzQuNzY4NTQgMTIuNjY2NSA1LjE2MzIxIDEyLjY2NjQgNS43MzIwNCAxMi42NjY0SDkuOTk4NDhDMTAuNTY3MSAxMi42NjY0IDEwLjk2MiAxMi42NjY1IDExLjI2ODggMTIuNjQxNEMxMS41NjkgMTIuNjE2OSAxMS43Mzg1IDEyLjU3MTQgMTEuODY0OSAxMi41MDdMMTEuOTY2NCAxMi40NUMxMi4xOTYzIDEyLjMwOSAxMi4zODM5IDEyLjEwNjUgMTIuNTA3IDExLjg2NDhMMTIuNTUxNiAxMS43NjFDMTIuNTkyNyAxMS42NDU5IDEyLjYyMyAxMS40OTQyIDEyLjY0MTQgMTEuMjY4N0MxMi42NjY1IDEwLjk2MTkgMTIuNjY2NCAxMC41NjcxIDEyLjY2NjQgOS45OTg0MVY5Ljg2NTYxQzEyLjY2NjQgOS41NzE5MyAxMi45MDQ3IDkuMzMzNzcgMTMuMTk4NSA5LjMzMzYxQzEzLjQ5MjIgOS4zMzM2MSAxMy43MzA1IDkuNTcxODUgMTMuNzMwNSA5Ljg2NTYxVjkuOTk4NDFDMTMuNzMwNSAxMC41NDk2IDEzLjczMSAxMC45OTUzIDEzLjcwMTYgMTEuMzU1NEMxMy42NzU0IDExLjY3NjIgMTMuNjIzNCAxMS45NjUxIDEzLjUwNzggMTIuMjM0NEwxMy40NTQ3IDEyLjM0ODRDMTMuMjQyMyAxMi43NjUyIDEyLjkxOTIgMTMuMTEzOCAxMi41MjI2IDEzLjM1N0wxMi4zNDg1IDEzLjQ1NDZDMTIuMDQ3IDEzLjYwODIgMTEuNzIxOSAxMy42NzE2IDExLjM1NTQgMTMuNzAxNUMxMC45OTUzIDEzLjczMSAxMC41NDk3IDEzLjczMDUgOS45OTg0OCAxMy43MzA1SDUuNzMyMDRDNS4xODA3NyAxMy43MzA1IDQuNzM1MiAxMy43MzEgNC4zNzUwMSAxMy43MDE1QzQuMDU0NTcgMTMuNjc1NCAzLjc2NTg1IDEzLjYyMzkgMy40OTY4OSAxMy41MDg2TDMuMzgyODIgMTMuNDU0NkMyLjk2NTkzIDEzLjI0MjIgMi42MTY3MyAxMi45MTkzIDIuMzczNDUgMTIuNTIyNkwyLjI3NTc5IDEyLjM0ODRDMi4xMjIyMSAxMi4wNDcgMi4wNTg4NSAxMS43MjE4IDIuMDI4OTIgMTEuMzU1NEMxLjk5OTUgMTAuOTk1MyAyLjAwMDAxIDEwLjU0OTYgMi4wMDAwMSA5Ljk5ODQxWk03LjMzMzYxIDIuNTMyMDNDNy4zMzM2MSAyLjIzODIxIDcuNTcxODIgMiA3Ljg2NTYgMkM4LjE1OTM2IDIuMDAwMTQgOC4zOTc2OCAyLjIzODMgOC4zOTc2OCAyLjUzMjAzVjguNTgwNDlMMTAuMTU1NCA2LjgyMjY1TDEwLjIzOSA2Ljc1NDY5QzEwLjQ0NTYgNi42MTgxIDEwLjcyNjcgNi42NDA3NyAxMC45MDg2IDYuODIyNjVDMTEuMTE2MSA3LjAzMDM5IDExLjExNjIgNy4zNjczMiAxMC45MDg2IDcuNTc1TDguMjQxNDQgMTAuMjQxNEM4LjE0MTY4IDEwLjM0MTEgOC4wMDY2NCAxMC4zOTc2IDcuODY1NiAxMC4zOTc3QzcuNzI0NTQgMTAuMzk3NyA3LjU4ODg0IDEwLjM0MTIgNy40ODkwNyAxMC4yNDE0TDQuODIyNjYgNy41NzVMNC43NTQ2OSA3LjQ5MTQxQzQuNjE4MjUgNy4yODQ4OSA0LjY0MDgzIDcuMDA0NDkgNC44MjI2NiA2LjgyMjY1QzUuMDA0NDkgNi42NDA4MiA1LjI4NDkgNi42MTgyNCA1LjQ5MTQxIDYuNzU0NjlMNS41NzUwMSA2LjgyMjY1TDcuMzMzNjEgOC41ODEyOVYyLjUzMjAzWiIgZmlsbD0iIzdDNkNGRiIvPgo8L2c+Cjwvc3ZnPgo=',
  imgIconLogIn: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uL2xvZ0luIj4KPHBhdGggaWQ9IlZlY3RvciIgZD0iTTUuODY2ODQgMi40NjgxTDUuOTk5NjQgMi40NjgxQzYuMjkzNCAyLjQ2ODEgNi41MzE2NCAyLjcwNjMxIDYuNTMxNjQgMy4wMDAxM0M2LjUzMTY0IDMuMjkzOTQgNi4yOTM0IDMuNTMyMTYgNS45OTk2NCAzLjUzMjE2TDUuODY2ODQgMy41MzIxNkM1LjI5ODEyIDMuNTMyMTYgNC45MDMzMiAzLjUzMjg5IDQuNTk2NTIgMy41NTc5NEM0LjI5NjA0IDMuNTgyNDkgNC4xMjY4NCAzLjYyNzk1IDQuMDAwNDQgMy42OTIzMkwzLjg5ODg0IDMuNzQ4NTdDMy42Njg5MiAzLjg4OTYyIDMuNDgxNCA0LjA5MjAzIDMuMzU4MiA0LjMzMzcyTDMuMzEzNzIgNC40Mzc2M0MzLjI3MjUyIDQuNTUyNjUgMy4yNDIyOCA0LjcwNDI2IDMuMjIzODggNC45Mjk4MkMzLjE5ODc2IDUuMjM2NjMgMy4xOTg4NCA1LjYzMTMgMy4xOTg4NCA2LjIwMDEzTDMuMTk4ODQgMTAuNDY2NkMzLjE5ODg0IDExLjAzNTIgMy4xOTg3NiAxMS40MzAxIDMuMjIzODggMTEuNzM2OUMzLjI0ODM2IDEyLjAzNzEgMy4yOTM4OCAxMi4yMDY2IDMuMzU4MiAxMi4zMzNMMy40MTUyNCAxMi40MzQ1QzMuNTU2MjggMTIuNjY0NCAzLjc1ODc2IDEyLjg1MiA0LjAwMDQ0IDEyLjk3NTFMNC4xMDQyOCAxMy4wMTk3QzQuMjE5MzIgMTMuMDYwOCA0LjM3MTA4IDEzLjA5MSA0LjU5NjUyIDEzLjEwOTVDNC45MDMzMiAxMy4xMzQ2IDUuMjk4MTIgMTMuMTM0NSA1Ljg2Njg0IDEzLjEzNDVMNS45OTk2NCAxMy4xMzQ1QzYuMjkzMzIgMTMuMTM0NSA2LjUzMTQ4IDEzLjM3MjggNi41MzE2NCAxMy42NjY2QzYuNTMxNjQgMTMuOTYwMyA2LjI5MzQgMTQuMTk4NiA1Ljk5OTY0IDE0LjE5ODZMNS44NjY4NCAxNC4xOTg2QzUuMzE1NjQgMTQuMTk4NiA0Ljg2OTk2IDE0LjE5OSA0LjUwOTggMTQuMTY5N0M0LjE4OSAxNC4xNDM0IDMuOTAwMTIgMTQuMDkxNCAzLjYzMDg0IDEzLjk3NTlMMy41MTY4NCAxMy45MjI4QzMuMTAwMDQgMTMuNzEwNCAyLjc1MTQ4IDEzLjM4NzMgMi41MDgyIDEyLjk5MDdMMi40MTA2IDEyLjgxNjZDMi4yNTcgMTIuNTE1MSAyLjE5MzY0IDEyLjE5IDIuMTYzNzIgMTEuODIzNUMyLjEzNDI4IDExLjQ2MzQgMi4xMzQ3NiAxMS4wMTc4IDIuMTM0NzYgMTAuNDY2NkwyLjEzNDc2IDYuMjAwMTNDMi4xMzQ3NiA1LjY0ODg2IDIuMTM0MjggNS4yMDMyOSAyLjE2MzcyIDQuODQzMUMyLjE4OTg4IDQuNTIyNjYgMi4yNDEzMiA0LjIzMzk0IDIuMzU2NjggMy45NjQ5OEwyLjQxMDYgMy44NTA5MUMyLjYyMyAzLjQzNDAyIDIuOTQ1OTYgMy4wODQ4MiAzLjM0MjYgMi44NDE1NEwzLjUxNjg0IDIuNzQzODhDMy44MTgyIDIuNTkwMyA0LjE0MzQgMi41MjY5NCA0LjUwOTggMi40OTcwMUM0Ljg2OTk2IDIuNDY3NTkgNS4zMTU2NCAyLjQ2ODEgNS44NjY4NCAyLjQ2ODFaTTUuOTk5NjQgNy44MDE3TDEyLjA0ODggNy44MDE3TDEwLjI5MDIgNi4wNDMxQzEwLjA4MjUgNS44MzUzOCAxMC4wODI2IDUuNDk4NTMgMTAuMjkwMiA1LjI5MDc1QzEwLjQ5OCA1LjA4MyAxMC44MzQ4IDUuMDgzIDExLjA0MjYgNS4yOTA3NUwxMy43MDk4IDcuOTU3MTZMMTMuNzc2MiA4LjAzODQxQzEzLjgzMzkgOC4xMjUxMiAxMy44NjUyIDguMjI4IDEzLjg2NTIgOC4zMzM2OUMxMy44NjUyIDguNDc0NTcgMTMuODA5MyA4LjYwOTg1IDEzLjcwOTggOC43MDk1M0wxMS4wNDI2IDExLjM3NjdDMTAuODM0OSAxMS41ODQyIDEwLjQ5NzkgMTEuNTg0MiAxMC4yOTAyIDExLjM3NjdDMTAuMDgyNSAxMS4xNjkgMTAuMDgyNSAxMC44MzEzIDEwLjI5MDIgMTAuNjIzNUwxMi4wNDgxIDguODY1NzdMNS45OTk2NCA4Ljg2NTc3QzUuNzA2MDQgOC44NjU2MSA1LjQ2NzcyIDguNjI3MzcgNS40Njc1NiA4LjMzMzY5QzUuNDY3NTYgOC4wMzk5OSA1LjcwNTk2IDcuODAxODMgNS45OTk2NCA3LjgwMTdaIiBmaWxsPSIjREIzQjRCIi8+CjwvZz4KPC9zdmc+Cg==',
  imgIconMenber: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uL21lbmJlciI+CjxwYXRoIGlkPSJWZWN0b3IiIGQ9Ik0xMC44MDAxIDZDMTAuODAwMSA0LjQ1MzYgOS41NDY0IDMuMTk5ODcgOCAzLjE5OTg3QzYuNDUzNiAzLjE5OTg3IDUuMTk5ODcgNC40NTM2IDUuMTk5ODcgNkM1LjE5OTg3IDcuNTQ2NCA2LjQ1MzYgOC44MDAxMyA4IDguODAwMTNDOS41NDY0IDguODAwMTMgMTAuODAwMSA3LjU0NjQgMTAuODAwMSA2Wk0xMC4xNTU2IDkuMjEwNDFDMTEuMTg3NiA4LjUxNjEyIDExLjg2NjUgNy4zMzczOCAxMS44NjY1IDZDMTEuODY2NSAzLjg2NDUgMTAuMTM1NSAyLjEzMzQ2IDggMi4xMzM0NkM1Ljg2NDUgMi4xMzM0NiA0LjEzMzQ2IDMuODY0NSA0LjEzMzQ2IDZDNC4xMzM0NiA3LjMzNzM4IDQuODEyMzggOC41MTYxMiA1Ljg0NDM3IDkuMjEwNDFDNS4zNDA2NiA5LjQwOTM2IDQuODYzNjcgOS42NzgzNiA0LjQyODM5IDEwLjAxMjRDMy40MDM4OSAxMC43OTg1IDIuNjY3NTcgMTEuOTAxMSAyLjMzMzMzIDEzLjE0ODRDMi4yNTcyIDEzLjQzMjkgMi40MjU4NiAxMy43MjUyIDIuNzEwMjkgMTMuODAxNEMyLjk5NDczIDEzLjg3NzcgMy4yODY5NiAxMy43MDg5IDMuMzYzMjggMTMuNDI0NUMzLjYzNjc2IDEyLjQwMzggNC4yMzk4MyAxMS41MDIgNS4wNzgxMiAxMC44NTg3QzUuOTE2NDEgMTAuMjE1NSA2Ljk0MzM3IDkuODY2NTQgOCA5Ljg2NjU0QzkuMDU2NjMgOS44NjY1NCAxMC4wODM2IDEwLjIxNTUgMTAuOTIxOSAxMC44NTg3QzExLjc2MDIgMTEuNTAyIDEyLjM2MzIgMTIuNDAzOCAxMi42MzY3IDEzLjQyNDVDMTIuNzEzIDEzLjcwODkgMTMuMDA1MyAxMy44Nzc3IDEzLjI4OTcgMTMuODAxNEMxMy41NzQxIDEzLjcyNTIgMTMuNzQyOCAxMy40MzI5IDEzLjY2NjcgMTMuMTQ4NEMxMy4zMzI0IDExLjkwMTEgMTIuNTk2MSAxMC43OTg2IDExLjU3MTYgMTAuMDEyNEMxMS4xMzYzIDkuNjc4MzYgMTAuNjU5MyA5LjQwOTM2IDEwLjE1NTYgOS4yMTA0MVoiIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjMTkxRDI1IiBmaWxsLW9wYWNpdHk9IjAuNjUiLz4KPC9nPgo8L3N2Zz4K',
  imgIconSetting: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uL3NldHRpbmciPgo8cGF0aCBpZD0iVmVjdG9yIiBkPSJNOC40MjE2NSAxLjMzMzM0QzkuMDg0NjEgMS4zMzMzNCA5LjY5ODA1IDEuNjg0ODMgMTAuMDMzMyAyLjI1Njc3TDEwLjY5MDQgMy4zNzcwOEwxMC43MzMzIDMuNDMyNTVDMTAuNzgyMyAzLjQ4MDg3IDEwLjg0ODcgMy41MDkzIDEwLjkxOTMgMy41MDk5TDEyLjIxMTUgMy41MjAwNUwxMi4zMzQ5IDMuNTI1NTJDMTIuOTQ5NSAzLjU3MTE1IDEzLjUwNTQgMy45MTgwMSAxMy44MTU0IDQuNDU2NzdMMTQuMDc3OSA0LjkxMzhMMTQuMTM2NSA1LjAyMjM5QzE0LjM4ODYgNS41MzYzNiAxNC4zOTA5IDYuMTM4NDggMTQuMTQyOCA2LjY1NDQzTDE0LjA4NTcgNi43NjMwMkwxMy40NDM1IDcuOTAwNTJDMTMuMzk3NiA3Ljk4MjE4IDEzLjM5NzUgOC4wODIxOSAxMy40NDM1IDguMTYzNzlMMTQuMDg1NyA5LjMwMDUxTDE0LjE0MjggOS40MDk4N0MxNC4zOTA4IDkuOTI1ODcgMTQuMzg4NyAxMC41MjggMTQuMTM2NSAxMS4wNDJMMTQuMDc3OSAxMS4xNTA1TDEzLjgxNTQgMTEuNjA3NkMxMy41MDU0IDEyLjE0NjIgMTIuOTQ5NCAxMi40OTMyIDEyLjMzNDkgMTIuNTM4OEwxMi4yMTE1IDEyLjU0MzVMMTAuOTE5MyAxMi41NTQ0QzEwLjg0ODcgMTIuNTU1IDEwLjc4MjQgMTIuNTgzNCAxMC43MzMzIDEyLjYzMThMMTAuNjkwNCAxMi42ODY0TDEwLjAzMzMgMTMuODA3NkM5LjY5ODA1IDE0LjM3OTQgOS4wODQ1MyAxNC43MzEgOC40MjE2NSAxNC43MzFINy45MDQ0NUM3LjI4MzA5IDE0LjczMDggNi43MDUxMyAxNC40MjIgNi4zNTkxNCAxMy45MTIzTDYuMjkzNTIgMTMuODA3Nkw1LjYzNjQ5IDEyLjY4NjRDNS42MDA3MSAxMi42MjU1IDUuNTQyNzYgMTIuNTgyMSA1LjQ3NjMzIDEyLjU2MzhMNS40MDc1OCAxMi41NTQ0TDQuMTE1MzkgMTIuNTQzNUMzLjQ5MzggMTIuNTM4NCAyLjkxODIxIDEyLjIyNTEgMi41NzYzMyAxMS43MTIzTDIuNTExNDggMTEuNjA3NkwyLjI0ODk5IDExLjE1MDVDMS45MTk5MyAxMC41Nzg1IDEuOTE2NzcgOS44NzUxNSAyLjI0MTE3IDkuMzAwNTFMMi44ODI1OCA4LjE2Mzc5TDIuOTA5MTQgOC4wOTk3MUMyLjkyMDY4IDguMDU1NDcgMi45MjA2NCA4LjAwODg1IDIuOTA5MTQgNy45NjQ1OUwyLjg4MjU4IDcuOTAwNTJMMi4yNDExNyA2Ljc2MzAyQzEuOTE2ODkgNi4xODg0MyAxLjkxOTk5IDUuNDg1NzEgMi4yNDg5OSA0LjkxMzhMMi41MTE0OCA0LjQ1Njc3TDIuNTc2MzMgNC4zNTIwOEMyLjkxODE5IDMuODM5MTkgMy40OTM3MyAzLjUyNTEyIDQuMTE1MzkgMy41MjAwNUw1LjQwNzU4IDMuNTA5OUw1LjQ3NjMzIDMuNTAwNTJDNS41NDI4NCAzLjQ4MjIzIDUuNjAwNyAzLjQzODEzIDUuNjM2NDkgMy4zNzcwOEw2LjI5MzUyIDIuMjU2NzdMNi4zNTkxNCAyLjE1MjA4QzYuNzA1MTIgMS42NDIyNSA3LjI4MzAyIDEuMzMzNDYgNy45MDQ0NSAxLjMzMzM0SDguNDIxNjVaTTcuOTA0NDUgMi4zOTczOUM3LjY1NSAyLjM5NzUxIDcuNDIxODkgMi41MTMxNCA3LjI3MDg2IDIuNzA2NzdMNy4yMTE0OCAyLjc5NTA1TDYuNTU0NDUgMy45MTUzNkM2LjM0Njk2IDQuMjY5MzkgNS45ODk4IDQuNTA0NzggNS41ODk2MSA0LjU2MDY3TDUuNDE2MTcgNC41NzM5Nkw0LjEyMzk5IDQuNTg0MTFDMy44NzQ0NCA0LjU4NjE1IDMuNjQyMjUgNC43MDQwNCAzLjQ5MjczIDQuODk4OTZMMy40MzMzNiA0Ljk4NzI0TDMuMTcwODYgNS40NDQyN0MzLjAyOTMxIDUuNjkwNDMgMy4wMjgxMyA1Ljk5MzA4IDMuMTY3NzMgNi4yNDAzNkwzLjgwOTE0IDcuMzc3MDhMMy44ODQ5MyA3LjUzMzM0QzQuMDEzOTcgNy44NTI4NyA0LjAxMzg0IDguMjEwNTkgMy44ODQ5MyA4LjUzMDE5TDMuODA5MTQgOC42ODcyM0wzLjE2NzczIDkuODIzOTVDMy4wMjgxNiAxMC4wNzEyIDMuMDI5MjUgMTAuMzczOSAzLjE3MDg2IDEwLjYyTDMuNDMzMzYgMTEuMDc2M0wzLjQ5MjczIDExLjE2NDZDMy42NDIyNSAxMS4zNTk3IDMuODc0MjkgMTEuNDc3NCA0LjEyMzk5IDExLjQ3OTRMNS40MTYxNyAxMS40OTA0TDUuNTg5NjEgMTEuNTAyOEM1Ljk4OTgzIDExLjU1ODggNi4zNDY5NCAxMS43OTQ5IDYuNTU0NDUgMTIuMTQ5TDcuMjExNDggMTMuMjY5Mkw3LjI3MDg2IDEzLjM1NjhDNy40MjE4OCAxMy41NTA2IDcuNjU0ODcgMTMuNjY2OCA3LjkwNDQ1IDEzLjY2NjlIOC40MjE2NUM4LjcwNjkzIDEzLjY2NjkgOC45NzEwOSAxMy41MTU0IDkuMTE1NDEgMTMuMjY5Mkw5Ljc3MjQ1IDEyLjE0OUw5Ljg3MDA1IDEyLjAwNDRDMTAuMTE4MSAxMS42ODU1IDEwLjUwMDUgMTEuNDkzNyAxMC45MTA3IDExLjQ5MDRMMTIuMjAyOSAxMS40Nzk0TDEyLjMwODQgMTEuNDcxNkMxMi41NTE4IDExLjQzNzQgMTIuNzY5IDExLjI5MjggMTIuODkzNSAxMS4wNzYzTDEzLjE1NjEgMTAuNjJMMTMuMjAyMSAxMC41MjU2QzEzLjI4MjEgMTAuMzMxNiAxMy4yODM0IDEwLjExMzkgMTMuMjA1MyA5LjkxOTIzTDEzLjE1OTIgOS44MjM5NUwxMi41MTY5IDguNjg3MjNDMTIuMjg3NiA4LjI4MDgzIDEyLjI4NzYgNy43ODM0NyAxMi41MTY5IDcuMzc3MDhMMTMuMTU5MiA2LjI0MDM2TDEzLjIwNTMgNi4xNDUwNUMxMy4yODM1IDUuOTUwNDggMTMuMjgyMSA1LjczMjcxIDEzLjIwMjEgNS41Mzg4TDEzLjE1NjEgNS40NDQyN0wxMi44OTM1IDQuOTg3MjRDMTIuNzY4OSA0Ljc3MDc0IDEyLjU1MTkgNC42MjYxNSAxMi4zMDg0IDQuNTkxOTNMMTIuMjAyOSA0LjU4NDExTDEwLjkxMDcgNC41NzM5NkMxMC41MDA1IDQuNTcwNjEgMTAuMTE4MSA0LjM3ODc2IDkuODcwMDUgNC4wNTk5TDkuNzcyNDUgMy45MTUzNkw5LjExNTQxIDIuNzk1MDVDOC45NzEwOSAyLjU0ODg3IDguNzA3MDEgMi4zOTczOSA4LjQyMTY1IDIuMzk3MzlINy45MDQ0NVpNOS40MzE4MSA4LjAzMTc3QzkuNDMxNjUgNy4zMzE3MiA4Ljg2Mzg5IDYuNzY0MDEgOC4xNjM4MSA2Ljc2MzhDNy40NjM2MiA2Ljc2MzggNi44OTUyMiA3LjMzMTU5IDYuODk1MDggOC4wMzE3N0M2Ljg5NTA4IDguNzMyMDMgNy40NjM1MyA5LjI5OTcxIDguMTYzODEgOS4yOTk3MUM4Ljg2Mzk3IDkuMjk5NTUgOS40MzE4MSA4LjczMTk1IDkuNDMxODEgOC4wMzE3N1pNMTAuNDk1MSA4LjAzMTc3QzEwLjQ5NTEgOS4zMTk1NSA5LjQ1MTU3IDEwLjM2MzYgOC4xNjM4MSAxMC4zNjM4QzYuODc1OSAxMC4zNjM4IDUuODMxOCA5LjMxOTcxIDUuODMxOCA4LjAzMTc3QzUuODMxOTQgNi43NDM5NiA2Ljg3NTk5IDUuNjk5NzQgOC4xNjM4MSA1LjY5OTc0QzkuNDUxNDkgNS42OTk5NSAxMC40OTQ5IDYuNzQ0MDkgMTAuNDk1MSA4LjAzMTc3WiIgZmlsbD0iIzE5MUQyNSIgZmlsbC1vcGFjaXR5PSIwLjY1Ii8+CjwvZz4KPC9zdmc+Cg==',
  imgLeft: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIwIiB2aWV3Qm94PSIwIDAgMTQgMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJMZWZ0Ij4KPHBhdGggaWQ9IkVsbGlwc2UgMTEiIGQ9Ik0xMC41NzA2IDE4Ljc5ODVDOC44ODk5MiAxOC4zNDgyIDcuMzE0MzYgMTcuNTcxMiA1LjkzMzkxIDE2LjUxMTlDNC41NTM0NiAxNS40NTI3IDMuMzk1MTcgMTQuMTMxOSAyLjUyNTE2IDEyLjYyNUMxLjY1NTE2IDExLjExODEgMS4wOTA0NyA5LjQ1NDYgMC44NjMzNTYgNy43Mjk0N0MwLjYzNjIzOSA2LjAwNDM0IDAuNzUxMTM1IDQuMjUxMzcgMS4yMDE0OCAyLjU3MDY0IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2U9IiMxOTFEMjUiIHN0cm9rZS1vcGFjaXR5PSIwLjE1Ii8+CjxwYXRoIGlkPSJFbGxpcHNlIDE0IiBkPSJNMTAuNTcwNiAxOC43OTg1QzguMDc4MSAxOC4xMzA2IDUuODM0ODIgMTYuNzQ5NSA0LjExNjIxIDE0LjgyNDZDMi4zOTc2IDEyLjg5OTcgMS4yNzg0NiAxMC41MTQ4IDAuODk2MTk0IDcuOTYyODQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZT0iIzE5MUQyNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNDUiLz4KPC9nPgo8L3N2Zz4K',
  imgLeft1: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE1IiBoZWlnaHQ9IjIwLjUzMTgiIHZpZXdCb3g9IjAgMCAxNSAyMC41MzE4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBpZD0iTGVmdCI+CjxwYXRoIGlkPSJFbGxpcHNlIDExIiBkPSJNMTEuNDQxMiAxOS4yODE1QzkuNjk3MDkgMTguODE0MSA4LjA2MjA3IDE4LjAwNzggNi42Mjk1MyAxNi45MDg2QzUuMTk2OTkgMTUuODA5NCAzLjk5NDk5IDE0LjQzODggMy4wOTIxNSAxMi44NzVDMi4xODkzMSAxMS4zMTEyIDEuNjAzMzIgOS41ODQ5NiAxLjM2NzYzIDcuNzk0NzNDMS4xMzE5NSA2LjAwNDUgMS4yNTExOCA0LjE4NTM4IDEuNzE4NTIgMi40NDEyMyIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlPSIjMTkxRDI1IiBzdHJva2Utb3BhY2l0eT0iMC4xNSIvPgo8cGF0aCBpZD0iRWxsaXBzZSAxNCIgZD0iTTExLjQ0MTIgMTkuMjgxNUM4Ljg1NDY0IDE4LjU4ODQgNi41MjY3IDE3LjE1NTEgNC43NDMyNCAxNS4xNTc2QzIuOTU5NzcgMTMuMTYwMSAxLjc5ODQgMTAuNjg1MiAxLjQwMTcxIDguMDM2OTEiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZT0iIzE5MUQyNSIvPgo8L2c+Cjwvc3ZnPgo=',
  imgRIght: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIwIiB2aWV3Qm94PSIwIDAgMTQgMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJSSWdodCI+CjxwYXRoIGlkPSJFbGxpcHNlIDEwIiBkPSJNMTIuNzk4NSAyLjU3MDY1QzEzLjI0ODkgNC4yNTEzOCAxMy4zNjM4IDYuMDA0MzUgMTMuMTM2NiA3LjcyOTQ4QzEyLjkwOTUgOS40NTQ2MSAxMi4zNDQ4IDExLjExODEgMTEuNDc0OCAxMi42MjVDMTAuNjA0OCAxNC4xMzE5IDkuNDQ2NTMgMTUuNDUyNyA4LjA2NjA4IDE2LjUxMTlDNi42ODU2MyAxNy41NzEyIDUuMTEwMDcgMTguMzQ4MiAzLjQyOTM0IDE4Ljc5ODUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZT0iIzE5MUQyNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMTUiLz4KPHBhdGggaWQ9IkVsbGlwc2UgMTMiIGQ9Ik0xMi43OTg1IDIuNTcwNjVDMTMuMjQ4OSA0LjI1MTM4IDEzLjM2MzggNi4wMDQzNSAxMy4xMzY2IDcuNzI5NDhDMTIuOTA5NSA5LjQ1NDYxIDEyLjM0NDggMTEuMTE4MSAxMS40NzQ4IDEyLjYyNUMxMC42MDQ4IDE0LjEzMTkgOS40NDY1MyAxNS40NTI3IDguMDY2MDggMTYuNTExOUM2LjY4NTYzIDE3LjU3MTIgNS4xMTAwNyAxOC4zNDgyIDMuNDI5MzQgMTguNzk4NSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlPSIjMTkxRDI1IiBzdHJva2Utb3BhY2l0eT0iMC40NSIvPgo8L2c+Cjwvc3ZnPgo=',
  imgRIght1: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE1IiBoZWlnaHQ9IjIwLjUzMTgiIHZpZXdCb3g9IjAgMCAxNSAyMC41MzE4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBpZD0iUklnaHQiPgo8cGF0aCBpZD0iRWxsaXBzZSAxMCIgZD0iTTEzLjI4MTUgMi40NDEyNEMxMy43NDg4IDQuMTg1MzkgMTMuODY4MSA2LjAwNDUxIDEzLjYzMjQgNy43OTQ3NEMxMy4zOTY3IDkuNTg0OTcgMTIuODEwNyAxMS4zMTEyIDExLjkwNzggMTIuODc1QzExLjAwNSAxNC40Mzg4IDkuODAzIDE1LjgwOTQgOC4zNzA0NiAxNi45MDg2QzYuOTM3OTIgMTguMDA3OCA1LjMwMjkgMTguODE0MSAzLjU1ODc1IDE5LjI4MTUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZT0iIzE5MUQyNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMTUiLz4KPHBhdGggaWQ9IkVsbGlwc2UgMTMiIGQ9Ik0xMy4yODE1IDIuNDQxMjRDMTMuNzQ4OCA0LjE4NTM5IDEzLjg2ODEgNi4wMDQ1MSAxMy42MzI0IDcuNzk0NzRDMTMuMzk2NyA5LjU4NDk3IDEyLjgxMDcgMTEuMzExMiAxMS45MDc4IDEyLjg3NUMxMS4wMDUgMTQuNDM4OCA5LjgwMyAxNS44MDk0IDguMzcwNDYgMTYuOTA4NkM2LjkzNzkyIDE4LjAwNzggNS4zMDI5IDE4LjgxNDEgMy41NTg3NSAxOS4yODE1IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2U9IiMxOTFEMjUiLz4KPC9nPgo8L3N2Zz4K',
  imgTop: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjI4IiBoZWlnaHQ9IjkiIHZpZXdCb3g9IjAgMCAyOCA5IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBpZD0iVG9wIj4KPHBhdGggaWQ9IkVsbGlwc2UgOSIgZD0iTTQuMjc3MjggNS4yNzcyOEM2Ljg1NTkxIDIuNjk4NjYgMTAuMzUzMyAxLjI1IDE0IDEuMjVDMTcuNjQ2NyAxLjI1IDIxLjE0NDEgMi42OTg2NiAyMy43MjI3IDUuMjc3MjgiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZT0iIzE5MUQyNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMTUiLz4KPHBhdGggaWQ9IkVsbGlwc2UgMTIiIGQ9Ik00LjI3NzI4IDUuMjc3MjhDNi4xNTc1MiAzLjM5NzA0IDguNTQyNjIgMi4xMDIzMiAxMS4xNDM3IDEuNTQ5OTUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZT0iIzE5MUQyNSIvPgo8L2c+Cjwvc3ZnPgo=',
  imgUsageArrow: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiB2aWV3Qm94PSIwIDAgMTQgMTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uLyYjMjMxOyYjMTc0OyYjMTczOyYjMjI5OyYjMTY0OyYjMTgwOy4mIzIzMDsmIzE1MDsmIzE1NjsiPgo8cGF0aCBpZD0iVmVjdG9yIiBkPSJNOS45MDgxNiAzLjUyNDI4TDQuMjA0OTQgMy42OTcxQzQuMDg0MzYgMy43MDA3NiAzLjk2NzY0IDMuNjU0NDUgMy44ODIzNCAzLjU2OTE1QzMuNzExNDkgMy4zOTgzIDMuNzExNDkgMy4xMjEyOCAzLjg4MjM0IDIuOTUwNDRDMy45NjExNSAyLjg3MTYzIDQuMDY3MDYgMi44MjU4NyA0LjE3ODQ0IDIuODIyNTFMMTAuNjc0NiAyLjYyNTY1QzExLjA5NDUgMi42MTI5MyAxMS40MzgyIDIuOTU2NjkgMTEuNDI1NSAzLjM3NjU3TDExLjIyODcgOS44NzI3MkMxMS4yMjUzIDkuOTg0MTEgMTEuMTc5NSAxMC4wOSAxMS4xMDA3IDEwLjE2ODhDMTAuOTI5OSAxMC4zMzk3IDEwLjY1MjkgMTAuMzM5NyAxMC40ODIgMTAuMTY4OEMxMC4zOTY3IDEwLjA4MzUgMTAuMzUwNCA5Ljk2NjgxIDEwLjM1NDEgOS44NDYyMkwxMC41MjY5IDQuMTQzTDMuNTA4NzYgMTEuMTYxMUMzLjMzNzkxIDExLjMzMiAzLjA2MDg5IDExLjMzMiAyLjg5MDA0IDExLjE2MTFDMi43MTkxOSAxMC45OTAzIDIuNzE5MTkgMTAuNzEzMiAyLjg5MDA0IDEwLjU0MjRMOS45MDgxNiAzLjUyNDI4WiIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMxOTFEMjUiIGZpbGwtb3BhY2l0eT0iMC40NSIvPgo8L2c+Cjwvc3ZnPgo=',
  imgUsageDashboard: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJpY29uLyYjMjI4OyYjMTg3OyYjMTcwOyYjMjMyOyYjMTYxOyYjMTY4OyYjMjMxOyYjMTU1OyYjMTUyOyI+CjxwYXRoIGlkPSJWZWN0b3IiIGQ9Ik0xNC4xMDAzIDkuMzMzMDRDMTQuMTAwMyA4LjI2MjMyIDEzLjgxNzkgNy4yMTAyIDEzLjI4MjYgNi4yODI5MUMxMi43NDcyIDUuMzU1NzQgMTEuOTc3MyA0LjU4NTg0IDExLjA1MDEgNC4wNTA0OUMxMC4xMjI4IDMuNTE1MDggOS4wNzA4IDMuMjMyNzggOCAzLjIzMjc4QzYuOTI5MiAzLjIzMjc4IDUuODc3MiAzLjUxNTA4IDQuOTQ5ODcgNC4wNTA0OUM0LjAyMjcgNC41ODU4NCAzLjI1Mjc5IDUuMzU1NzQgMi43MTc0NSA2LjI4MjkxQzIuMTgyMTEgNy4yMTAyIDEuODk5NzQgOC4yNjIzMiAxLjg5OTc0IDkuMzMzMDRDMS44OTk3OCAxMC40MDM4IDIuMTgyMDMgMTEuNDU1OSAyLjcxNzQ1IDEyLjM4MzJDMi44NzM5NCAxMi42NTQyIDIuNzgwNzkgMTMuMDAwOCAyLjUwOTc3IDEzLjE1NzNDMi4yMzg3NyAxMy4zMTM2IDEuODkyMTYgMTMuMjIxMiAxLjczNTY4IDEyLjk1MDJDMS4xMDA3NSAxMS44NTA2IDAuNzY2OTc1IDEwLjYwMjggMC43NjY5MjcgOS4zMzMwNEMwLjc2NjkyNyA4LjA2MzM5IDEuMTAwODggNi44MTYwNyAxLjczNTY4IDUuNzE2NUMyLjM3MDUyIDQuNjE2ODcgMy4yODM4NSAzLjcwMzYgNC4zODM0NiAzLjA2ODcyQzUuNDgzMDQgMi40MzM5MSA2LjczMDMzIDIuMDk5OTcgOCAyLjA5OTk3QzkuMjY5NjYgMi4wOTk5NyAxMC41MTcgMi40MzM5MSAxMS42MTY1IDMuMDY4NzJDMTIuNzE2MSAzLjcwMzYgMTMuNjI5NSA0LjYxNjg3IDE0LjI2NDMgNS43MTY1QzE0Ljg5OTEgNi44MTYwNyAxNS4yMzMxIDguMDYzMzkgMTUuMjMzMSA5LjMzMzA0QzE1LjIzMyAxMC42MDI4IDE0Ljg5OTMgMTEuODUwNiAxNC4yNjQzIDEyLjk1MDJDMTQuMTA3OCAxMy4yMjEyIDEzLjc2MTIgMTMuMzEzNiAxMy40OTAyIDEzLjE1NzNDMTMuMjE5MiAxMy4wMDA4IDEzLjEyNjEgMTIuNjU0MiAxMy4yODI2IDEyLjM4MzJDMTMuODE4IDExLjQ1NTkgMTQuMTAwMiAxMC40MDM4IDE0LjEwMDMgOS4zMzMwNFpNMTAuMjY2MyA2LjI2NTk4QzEwLjQ4NzUgNi4wNDQ4OCAxMC44NDU4IDYuMDQ0ODggMTEuMDY3MSA2LjI2NTk4QzExLjI4ODQgNi40ODcyOCAxMS4yODg0IDYuODQ2MTIgMTEuMDY3MSA3LjA2NzQyTDguNDAwMzkgOS43MzQwOEM4LjE3OTE0IDkuOTU1MTQgNy44MjA4NiA5Ljk1NTE0IDcuNTk5NjEgOS43MzQwOEM3LjM3ODMxIDkuNTEyNzggNy4zNzgzMSA5LjE1Mzk1IDcuNTk5NjEgOC45MzI2NUwxMC4yNjYzIDYuMjY1OThaIiBmaWxsPSIjMTkxRDI1IiBmaWxsLW9wYWNpdHk9IjAuNjUiLz4KPC9nPgo8L3N2Zz4K',
  imgVector: 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjEwIiBoZWlnaHQ9IjUiIHZpZXdCb3g9IjAgMCAxMCA1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBpZD0iVmVjdG9yIiBkPSJNMCAwLjU0NTE2M0MwIDAuMjQ0MDc4IDAuMjQ0MDc4IDAgMC41NDUxNjIgMEg5LjQ1NDg0QzkuNzU1OTIgMCAxMCAwLjI0NDA3OCAxMCAwLjU0NTE2MlYwLjkxODc1NUMxMCAxLjAxMzUxIDkuOTIzMTkgMS4wOTAzMyA5LjgyODQzIDEuMDkwMzNDOS4yOTc5OSAxLjA5MDMzIDguNzg5MjkgMS4zMjAwNyA4LjQxNDIxIDEuNzI5MDNMNS43MDcxMSA0LjY4MDY1QzUuMzE2NTggNS4xMDY0NSA0LjY4MzQyIDUuMTA2NDUgNC4yOTI4OSA0LjY4MDY1TDEuNTg1NzkgMS43MjkwM0MxLjIxMDcxIDEuMzIwMDcgMC43MDIwMDYgMS4wOTAzMyAwLjE3MTU3MyAxLjA5MDMzQzAuMDc2ODE1NyAxLjA5MDMzIDAgMS4wMTM1MSAwIDAuOTE4NzUzVjAuNTQ1MTYzWiIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMxOTFEMjUiLz4KPC9zdmc+Cg==',
}

const styles = `
.au-widget {
  box-sizing: border-box;
  color: #191d25;
  font-family: 'Alibaba PuHuiTi 2.0', system-ui, sans-serif;
  --au-width: 241px;
  --au-actions-height: 138px;
  --au-usage-delay: 0ms;
  --au-settings-delay: 50ms;
  --au-open-curve: cubic-bezier(0.009765625, 1.1181143522262573, 0.41531336307525635, 1);
  position: relative;
  width: min(var(--au-width), calc(100vw - 24px));
}
.au-widget[data-open='true'] {
  --au-usage-delay: 50ms;
  --au-settings-delay: 0ms;
}
.au-widget *, .au-widget *::before, .au-widget *::after { box-sizing: border-box; }
.au-widget button {
  appearance: none;
  border: 0;
  margin: 0;
  background-color: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.au-widget img { display: block; }
.au-trigger, .au-update, .au-id { padding: 0; }
.au-widget .au-update { background-color: rgb(124 108 255 / 8%); }
.au-widget .au-update:hover { background-color: rgb(124 108 255 / 16%); }
.au-widget .au-action { font-size: 12px; }
.au-widget .au-id { font-size: 10px; color: rgb(25 29 37 / 45%); }
.au-widget .au-action[data-action='logout'] { color: #db3b4b; }
.au-widget button:focus-visible { outline: 2px solid #7c6cff; outline-offset: 1px; }
.au-row {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  margin-inline: 6px;
  padding: 4px;
  border-radius: 999px;
  transition: background 100ms ease-out;
}
.au-widget[data-open='false'] .au-row:hover { background: rgb(25 29 37 / 3%); }
.au-trigger {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 28px;
  text-align: left;
}
.au-name {
  position: relative;
  top: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.2;
  transition: top 200ms ease-out, font-size 200ms ease-out;
}
.au-widget[data-open='true'] .au-name { top: -5px; font-size: 12px; }
.au-widget[data-open='true'] :is(.au-name, .au-id) {
  transition-duration: 150ms;
  transition-timing-function: var(--au-open-curve);
}
.au-avatar { position: relative; display: grid; place-items: center; flex: 0 0 28px; height: 28px; }
.au-avatar b { position: absolute; font-size: 14px; color: rgb(25 29 37 / 65%); }
.au-settings-avatar {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease-out;
}
.au-settings-avatar img { grid-area: 1 / 1; }
.au-settings-avatar img + img {
  opacity: 0;
  transform: scale(.7857142857);
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}
.au-widget[data-open='true'] :is(.au-settings-avatar, .au-settings-avatar img + img) {
  opacity: 1;
  transform: scale(1);
  transition-duration: 150ms;
  transition-timing-function: var(--au-open-curve);
}
.au-avatar[data-active='true'] b { color: white; }
.au-region { position: absolute; inset: 0; display: block; }
.au-top { inset: 0 0 auto; height: 8px; }
.au-right { inset: 8px 0 0 14px; }
.au-left { inset: 8px 14px 0 0; }
.au-arc-base, .au-arc-highlight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 100ms ease-out;
}
.au-top .au-arc-base img { position: absolute; left: 13.86%; }
.au-top .au-arc-base img + img { top: .2884px; }
.au-top .au-arc-highlight { top: -1px; }
.au-left .au-arc-highlight { left: -1px; }
.au-arc-base img, .au-arc-highlight img { max-width: none; }
.au-arc-highlight, .au-region:hover .au-arc-base { opacity: 0; }
.au-region:hover .au-arc-highlight { opacity: 1; }
.au-avatar-tooltip {
  position: absolute;
  z-index: 3;
  bottom: 36px;
  left: -4px;
  width: max-content;
  max-width: 240px;
  padding: 4px 8px;
  color: white;
  background: #191d25;
  filter: drop-shadow(0 3px 6px rgb(27 31 38 / 18%));
  border-radius: 8px;
  font-size: 14px;
  line-height: 24px;
  font-weight: 300;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  transition: opacity 100ms ease-out, visibility 0s linear 100ms;
}
.au-top .au-avatar-tooltip { bottom: 16px; }
.au-right .au-avatar-tooltip { left: -18px; }
.au-tooltip-arrow { position: absolute; left: 13px; bottom: -4px; }
.au-region:hover .au-avatar-tooltip {
  visibility: visible;
  opacity: 1;
  transition-delay: 0s;
}
.au-update {
  flex: 0 0 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  transition: background 100ms ease-out;
}
.au-panel {
  position: absolute;
  inset: auto 0 -7px;
  padding-bottom: var(--au-actions-height);
  visibility: hidden;
  pointer-events: none;
  transition: visibility 0s linear 250ms;
}
.au-widget[data-open='true'] .au-panel {
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}
.au-glass {
  box-sizing: border-box;
  border: .5px solid rgb(17 25 37 / 15%);
  background: rgb(255 255 255 / 85%);
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 20px rgb(0 0 0 / 4%);
}
.au-usage {
  position: relative;
  z-index: 1;
  margin-inline: 6px;
  height: 39px;
  overflow: clip;
  opacity: 0;
  transform: translateY(var(--au-actions-height));
  border-radius: 12px;
  padding: 5px;
  display: grid;
  grid-auto-rows: max-content;
  gap: 2px;
}
.au-actions { opacity: 0; }
.au-usage, .au-meter span {
  transition: transform 200ms ease-out, margin-inline 200ms ease-out, height 200ms ease-out, opacity 200ms ease-out, width 200ms ease-out;
  transition-delay: var(--au-usage-delay);
}
.au-widget[data-open='true'] :is(.au-usage, .au-meter span) {
  transition-duration: 150ms;
  transition-timing-function: var(--au-open-curve);
}
.au-widget[data-open='true'] .au-usage { pointer-events: auto; margin-inline: 0; height: 180px; opacity: 1; transform: translateY(0); }
.au-widget[data-open='true'] .au-meter span { width: var(--au-fill); transition-delay: 100ms; }
.au-usage-action { text-align: left; }
.au-action-trailing { margin-left: auto; opacity: 0; transition: opacity 100ms ease-out; }
.au-action:is(:hover, :focus-visible) .au-action-trailing { opacity: 1; }
.au-quota { padding: 8px 10px 10px; border-radius: 6px; background: rgb(25 29 37 / 3%); }
.au-quota-title { display: flex; align-items: center; font-size: 12px; line-height: 18px; white-space: nowrap; }
.au-muted, .au-id { color: rgb(25 29 37 / 45%); }
.au-percent { margin-left: auto; font: 14px/1.2 'JetBrains Mono', monospace; }
.au-priority { margin-left: 3px; padding-inline: 4px; border-radius: 4px; color: #7c6cff; background: rgb(124 108 255 / 8%); }
.au-meter { height: 3px; margin-top: 6px; background: rgb(25 29 37 / 10%); border-radius: 99px; overflow: hidden; }
.au-meter span { display: block; width: 3px; height: 100%; background: #252525; border-radius: inherit; }
.au-actions {
  position: absolute;
  z-index: 2;
  inset: auto 6px 7px;
  height: 36px;
  padding: 0;
  overflow: hidden;
  border-radius: 18px;
  transition: inset 200ms ease-out, height 200ms ease-out, padding 200ms ease-out,
    border-radius 200ms ease-out, opacity 200ms ease-out;
}
.au-action-list {
  display: grid;
  gap: 2px;
  opacity: 0;
  transform: translateY(36px);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.au-widget[data-open='true'] .au-actions {
  inset: auto 0 0;
  height: var(--au-actions-height);
  padding: 6px;
  border-radius: 12px 12px 20px 20px;
  opacity: 1;
}
.au-widget[data-open='true'] .au-action-list { opacity: 1; transform: translateY(0); }
.au-widget[data-open='true'] :is(.au-actions, .au-action-list) {
  transition-duration: 150ms;
  transition-timing-function: var(--au-open-curve);
}
.au-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-inline: 8px;
  height: 28px;
  border-radius: 8px;
  font-size: 12px;
  transition: background 100ms ease-out;
}
.au-action:hover { background: rgb(25 29 37 / 3%); }
.au-shortcut { color: rgb(25 29 37 / 45%); }
.au-action[data-action='logout']:hover { background: rgba(219, 59, 75, 0.05); }
.au-id { position: absolute; z-index: 2; left: 45px; bottom: 10px; display: flex; align-items: center; gap: 2px; font-size: 10px; line-height: 12px; }
.au-row { pointer-events: none; }
.au-trigger, .au-update { pointer-events: auto; }
.au-widget :is(.au-actions, .au-action-list, .au-name, .au-id, .au-settings-avatar, .au-settings-avatar img + img) {
  transition-delay: var(--au-settings-delay);
}
@media (prefers-reduced-motion: reduce) {
  .au-widget[data-open] *, .au-widget[data-open] .au-panel { transition: none !important; }
}
.au-id {
  bottom: 5px;
  left: 40px;
  opacity: 0;
  transform: translateY(3px);
  pointer-events: none;
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.au-widget[data-open='true'] .au-id {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
`

const quotas = [
  ['活动额度', '12月1日', 100, true],
  ['加油包', '用完即止', 71],
  ['订阅额度', '12月1日', 38],
]
const actions = [
  ['logout', '退出登录', 'imgIconLogIn'],
  ['settings', '系统设置', 'imgIconSetting'],
  ['account', '账号设置', 'imgIconMenber'],
]

function Icon({ name, size = 16, width = size, height = size }) {
  return <img alt="" width={width} height={height} src={assets[name]} draggable={false} />
}

const avatarRegions = [
  ['top', 'imgEllipse9', 20.2383, 5.38084, 'imgTop', 28, 9, '加油包 · 71% · 用完即止'],
  ['right', 'imgRIght', 14, 20, 'imgRIght1', 15, 20.5318, '活动额度 · 100% · 12月1日结束'],
  ['left', 'imgLeft', 14, 20, 'imgLeft1', 15, 20.5318, '订阅额度 · 38% · 12月1日重置'],
]

function Avatar({ active, initial }) {
  return (
    <span className="au-avatar" data-active={active}>
      <Icon name="imgFigureStepfun" size={18} />
      <span className="au-settings-avatar" aria-hidden="true">
        <Icon name="imgFigureStepfun1" size={22} />
        <Icon name="imgFigureStepfun2" size={28} />
      </span>
      <b>{initial}</b>
      {!active && avatarRegions.map(([region, icon, width, height, hoverIcon, hoverWidth, hoverHeight, tooltip]) => (
        <span key={region} className={'au-region au-' + region}>
          <span className="au-arc-base">
            <Icon name={icon} width={width} height={height} />
            {region === 'top' && <Icon name="imgEllipse12" width={8.11687} height={5.09195} />}
          </span>
          <span className="au-arc-highlight">
            <Icon name={hoverIcon} width={hoverWidth} height={hoverHeight} />
          </span>
          <span className="au-avatar-tooltip" role="tooltip">
            {tooltip}
            <span className="au-tooltip-arrow"><Icon name="imgVector" width={10} height={5} /></span>
          </span>
        </span>
      ))}
    </span>
  )
}

/**
 * onAction receives usage, logout, settings, account, or update.
 * Allow enough space above the trigger for the expanded panels.
 */
export default function AccountUsage({ name, accountId, onAction }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const dismiss = (event) => {
      if (!root.current.contains(event.target)) setOpen(false)
    }
    const escape = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current.focus()
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  async function copyId() {
    try {
      await navigator.clipboard.writeText(accountId)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function toggle() {
    setCopied(false)
    setOpen(!open)
  }

  return (
    <div ref={root} className="au-widget" data-open={open} data-node-id="24826:27663">
      <style>{styles}</style>
      <div className="au-panel" id={panelId} aria-hidden={!open}>
        <section className="au-glass au-usage" aria-label="用量与套餐">
          <button className="au-action au-usage-action" type="button" tabIndex={open ? 0 : -1}
            onClick={() => onAction?.('usage')}>
            <Icon name="imgUsageDashboard" />用量与套餐
            <span className="au-action-trailing"><Icon name="imgUsageArrow" size={14} /></span>
          </button>
          {quotas.map(([label, note, percent, priority]) => (
            <div className="au-quota" key={label}>
              <div className="au-quota-title">
                {label}<span className="au-muted">· {note}</span>
                {priority && <span className="au-priority">优先</span>}
                <span className="au-percent">{percent}%</span>
              </div>
              <div className="au-meter" aria-hidden="true"><span style={{ '--au-fill': percent + '%' }} /></div>
            </div>
          ))}
        </section>
        <section className="au-glass au-actions" aria-label="账号操作">
          <div className="au-action-list">
            {actions.map(([action, label, icon]) => (
              <button key={action} type="button" className="au-action" data-action={action} tabIndex={open ? 0 : -1}
                onClick={() => onAction?.(action)}>
                <Icon name={icon} />{label}
                {action === 'account' && (
                  <span className="au-action-trailing"><Icon name="imgUsageArrow" size={14} /></span>
                )}
                {action === 'settings' && (
                  <span className="au-action-trailing au-shortcut" aria-hidden="true">⌘,</span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="au-row">
        <button ref={trigger} className="au-trigger" type="button" aria-expanded={open}
          aria-controls={panelId} aria-label={name + '，账号与用量'} onClick={toggle}>
          <Avatar active={open} initial={name.slice(0, 1)} />
          <span className="au-name">{name}</span>
        </button>
        <button className="au-id" type="button" onClick={copyId} tabIndex={open ? 0 : -1} aria-hidden={!open}
          aria-label={'复制账号 ID ' + accountId}>
          <span>{copied ? '已复制' : 'ID: ' + accountId}</span><Icon name="imgIconCopy" size={10} />
        </button>
        <button className="au-update" type="button" aria-label="下载更新" onClick={() => onAction?.('update')}>
          <Icon name="imgIconDownload" />
        </button>
      </div>
    </div>
  )
}
