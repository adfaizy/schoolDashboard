import sys
import tkinter as tk
from tkinter import simpledialog, messagebox


class PhoneDialer:
    def __init__(self, parent=None, contacts=None):
        self._standalone = parent is None
        if self._standalone:
            self.window = tk.Tk()
            self.window.title("Phone Dialer")
            self.window.geometry("380x720")
            self.window.minsize(360, 680)
            self.window.resizable(True, True)
        else:
            self.window = tk.Frame(parent)
            self.window.pack(fill="both", expand=True)
        # detect theme
        if sys.platform == "win32":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
                value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                winreg.CloseKey(key)
                dark = value == 0
            except Exception:
                dark = False
        else:
            dark = False
        _bg = "#eef2f8"
        if self._standalone:
            self.window.configure(bg=_bg)
        else:
            self.window.configure(bg=_bg)

        # App state
        self.contacts = [dict(c) for c in (contacts if contacts is not None else [
            {"name": "Mom", "number": "1234567890"},
            {"name": "Work", "number": "9876543210"},
        ])]
        self.call_history = []
        self.in_call = False

        # Color palette
        if sys.platform == "win32":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
                value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                winreg.CloseKey(key)
                dark = value == 0
            except Exception:
                dark = False
        else:
            dark = False
        # Sharp shadcn-style light palette on every OS theme.
        self.bg = "#eef2f8"
        self.card = "#ffffff"
        self.display_bg = "#dbe3ef"
        self.text = "#020617"
        self.muted = "#475569"
        self.digit_bg = "#0b5cff"
        self.digit_hover = "#0047d1"
        self.special_bg = "#8b5cf6"
        self.special_hover = "#7c3aed"
        self.call_bg = "#16a34a"
        self.call_hover = "#22c55e"
        self.end_bg = "#e11d48"
        self.end_hover = "#be123c"
        self.utility_bg = "#334155"
        self.utility_hover = "#475569"

        self._build_ui()

    def _build_ui(self):
        # Header
        header = tk.Frame(self.window, bg=self.bg)
        header.pack(fill="x", padx=20, pady=(20, 10))

        tk.Label(
            header,
            text="Phone",
            font=("Segoe UI", 24, "bold"),
            fg=self.text,
            bg=self.bg,
        ).pack(anchor="w")

        self.status_var = tk.StringVar(value="Ready")
        tk.Label(
            header,
            textvariable=self.status_var,
            font=("Segoe UI", 11),
            fg=self.muted,
            bg=self.bg,
        ).pack(anchor="w", pady=(2, 0))

        # Display card
        display_card = tk.Frame(self.window, bg=self.card, bd=0, relief="flat")
        display_card.pack(fill="x", padx=20, pady=10)

        self.dial_pad_display = tk.Label(
            display_card,
            text="",
            font=("Consolas", 28, "bold"),
            fg=self.text,
            bg=self.display_bg,
            anchor="e",
            padx=18,
            pady=22,
            relief="flat",
        )
        self.dial_pad_display.pack(fill="x", padx=12, pady=12)

        # Keypad
        keypad = tk.Frame(self.window, bg=self.bg)
        keypad.pack(pady=10)

        keys = [
            ("1", self.digit_bg, self.digit_hover),
            ("2", self.digit_bg, self.digit_hover),
            ("3", self.digit_bg, self.digit_hover),
            ("4", self.digit_bg, self.digit_hover),
            ("5", self.digit_bg, self.digit_hover),
            ("6", self.digit_bg, self.digit_hover),
            ("7", self.digit_bg, self.digit_hover),
            ("8", self.digit_bg, self.digit_hover),
            ("9", self.digit_bg, self.digit_hover),
            ("*", self.special_bg, self.special_hover),
            ("0", self.digit_bg, self.digit_hover),
            ("#", self.special_bg, self.special_hover),
        ]

        for index, (text, bg, hover) in enumerate(keys):
            row, col = divmod(index, 3)
            btn = self._make_button(
                keypad,
                text=text,
                bg=bg,
                hover=hover,
                width=7,
                height=2,
                font=("Segoe UI", 18, "bold"),
                command=lambda n=text: self.dial_number(n),
            )
            btn.grid(row=row, column=col, padx=8, pady=8)

        # Main actions
        actions = tk.Frame(self.window, bg=self.bg)
        actions.pack(fill="x", padx=20, pady=(12, 6))

        self.call_button = self._make_button(
            actions,
            text="Call",
            bg=self.call_bg,
            hover=self.call_hover,
            width=12,
            height=2,
            font=("Segoe UI", 14, "bold"),
            command=self.make_call,
        )
        self.call_button.pack(side="left", expand=True, fill="x", padx=(0, 6))

        self.end_call_button = self._make_button(
            actions,
            text="End",
            bg=self.end_bg,
            hover=self.end_hover,
            width=12,
            height=2,
            font=("Segoe UI", 14, "bold"),
            command=self.end_call,
            state="disabled",
        )
        self.end_call_button.pack(side="right", expand=True, fill="x", padx=(6, 0))

        # Utility row
        utilities = tk.Frame(self.window, bg=self.bg)
        utilities.pack(fill="x", padx=20, pady=6)

        self._make_button(
            utilities,
            text="Clear",
            bg=self.utility_bg,
            hover=self.utility_hover,
            width=8,
            height=1,
            font=("Segoe UI", 11, "bold"),
            command=self.clear_display,
        ).pack(side="left", expand=True, fill="x", padx=(0, 4))

        self._make_button(
            utilities,
            text="⌫",
            bg=self.utility_bg,
            hover=self.utility_hover,
            width=8,
            height=1,
            font=("Segoe UI", 11, "bold"),
            command=self.backspace,
        ).pack(side="left", expand=True, fill="x", padx=4)

        self._make_button(
            utilities,
            text="Contacts",
            bg=self.utility_bg,
            hover=self.utility_hover,
            width=8,
            height=1,
            font=("Segoe UI", 11, "bold"),
            command=self.show_contacts,
        ).pack(side="right", expand=True, fill="x", padx=(4, 0))

        # History panel
        history_card = tk.Frame(self.window, bg=self.card)
        history_card.pack(fill="both", expand=True, padx=20, pady=(10, 20))

        tk.Label(
            history_card,
            text="Recent Calls",
            font=("Segoe UI", 12, "bold"),
            fg=self.text,
            bg=self.card,
        ).pack(anchor="w", padx=14, pady=(12, 6))

        self.history_listbox = tk.Listbox(
            history_card,
            bg=self.display_bg,
            fg=self.text,
            font=("Consolas", 11),
            bd=0,
            highlightthickness=0,
            selectbackground=self.digit_bg,
            activestyle="none",
        )
        self.history_listbox.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        # Bind keyboard input
        self.window.bind("<Key>", self._on_key_press)

    def _make_button(self, parent, text, bg, hover, width, height, font, command, state="normal"):
        btn = tk.Button(
            parent,
            text=text,
            width=width,
            height=height,
            font=font,
            fg="white",
            bg=bg,
            activebackground=hover,
            activeforeground="white",
            relief="flat",
            bd=0,
            cursor="hand2",
            state=state,
            command=command,
        )

        def on_enter(_):
            if btn["state"] == "normal":
                btn.config(bg=hover)

        def on_leave(_):
            if btn["state"] == "normal":
                btn.config(bg=bg)

        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    def dial_number(self, number):
        current = self.dial_pad_display.cget("text")
        self.dial_pad_display.config(text=current + number)
        self.status_var.set("Dialing...")

    def backspace(self):
        current = self.dial_pad_display.cget("text")
        self.dial_pad_display.config(text=current[:-1])
        if not self.dial_pad_display.cget("text"):
            self.status_var.set("Ready")

    def clear_display(self):
        self.dial_pad_display.config(text="")
        self.status_var.set("Ready")

    def make_call(self):
        number = self.dial_pad_display.cget("text").strip()
        if not number:
            self.status_var.set("Enter a number first")
            messagebox.showinfo("Phone Dialer", "Please enter a number to call.")
            return

        self.in_call = True
        self.call_button.config(state="disabled", bg="#166534")
        self.end_call_button.config(state="normal", bg=self.end_bg)
        self.status_var.set(f"Calling {number}...")
        print(f"Making call to {number}")

        self.call_history.insert(0, number)
        self._refresh_history()

    def end_call(self):
        self.in_call = False
        self.call_button.config(state="normal", bg=self.call_bg)
        self.end_call_button.config(state="disabled", bg="#7f1d1d")
        self.status_var.set("Call ended")
        print("Ending call")

    def _refresh_history(self):
        self.history_listbox.delete(0, tk.END)
        for number in self.call_history[:8]:
            self.history_listbox.insert(tk.END, f"  {number}")

    def show_contacts(self):
        window = tk.Toplevel(self.window)
        window.title("Contacts")
        window.geometry("320x420")
        window.configure(bg=self.card)
        window.transient(self.window)
        window.grab_set()

        tk.Label(
            window,
            text="Contacts",
            font=("Segoe UI", 18, "bold"),
            fg=self.text,
            bg=self.card,
        ).pack(pady=(16, 8))

        listbox = tk.Listbox(
            window,
            bg=self.display_bg,
            fg=self.text,
            font=("Segoe UI", 12),
            bd=0,
            highlightthickness=0,
            selectbackground=self.digit_bg,
            activestyle="none",
        )
        listbox.pack(fill="both", expand=True, padx=16, pady=8)

        def refresh():
            listbox.delete(0, tk.END)
            for contact in self.contacts:
                listbox.insert(tk.END, f"{contact['name']}  —  {contact['number']}")

        refresh()

        button_row = tk.Frame(window, bg=self.card)
        button_row.pack(fill="x", padx=16, pady=12)

        def dial_selected():
            selection = listbox.curselection()
            if not selection:
                return
            contact = self.contacts[selection[0]]
            self.dial_pad_display.config(text=contact["number"])
            self.status_var.set(f"Selected {contact['name']}")
            window.destroy()

        def add_contact():
            name = simpledialog.askstring("Add Contact", "Name:", parent=window)
            if not name:
                return
            number = simpledialog.askstring("Add Contact", "Number:", parent=window)
            if not number:
                return
            self.contacts.append({"name": name.strip(), "number": number.strip()})
            refresh()

        def delete_contact():
            selection = listbox.curselection()
            if not selection:
                return
            del self.contacts[selection[0]]
            refresh()

        self._make_button(
            button_row,
            text="Dial",
            bg=self.call_bg,
            hover=self.call_hover,
            width=8,
            height=1,
            font=("Segoe UI", 11, "bold"),
            command=dial_selected,
        ).pack(side="left", expand=True, fill="x", padx=(0, 4))

        self._make_button(
            button_row,
            text="Add",
            bg=self.utility_bg,
            hover=self.utility_hover,
            width=8,
            height=1,
            font=("Segoe UI", 11, "bold"),
            command=add_contact,
        ).pack(side="left", expand=True, fill="x", padx=4)

        self._make_button(
            button_row,
            text="Delete",
            bg=self.end_bg,
            hover=self.end_hover,
            width=8,
            height=1,
            font=("Segoe UI", 11, "bold"),
            command=delete_contact,
        ).pack(side="right", expand=True, fill="x", padx=(4, 0))

    def _on_key_press(self, event):
        if event.char.isdigit() or event.char in "*#":
            self.dial_number(event.char)
        elif event.keysym == "BackSpace":
            self.backspace()
        elif event.keysym == "Return":
            self.make_call()
        elif event.keysym == "Escape":
            self.clear_display()

    def set_contacts(self, contacts):
        self.contacts = [dict(c) for c in (contacts or [])]
        try:
            self.show_contacts_refresh()
        except Exception:
            pass

    def run(self):
        if self._standalone:
            self.window.mainloop()


if __name__ == "__main__":
    phone_dialer = PhoneDialer()
    phone_dialer.run()
