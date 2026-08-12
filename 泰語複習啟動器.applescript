on run
	set webRoot to "/Users/anson/Documents/Thai/web"
	set serverURL to "http://127.0.0.1:4173/"
	set dataURL to serverURL & "data.js"
	set healthCheck to "/usr/bin/curl --fail --silent --max-time 1 " & quoted form of dataURL & " | /usr/bin/grep --quiet 'window.THAI_REVIEW_DATA'"

	try
		do shell script healthCheck
	on error
		do shell script "/usr/bin/nohup /usr/bin/python3 -m http.server 4173 --bind 127.0.0.1 --directory " & quoted form of webRoot & " >/tmp/thai-review-server.log 2>&1 </dev/null &"
		repeat 20 times
			delay 0.1
			try
				do shell script healthCheck
				exit repeat
			end try
		end repeat
	end try

	set cacheToken to do shell script "/bin/date +%s"
	do shell script "/usr/bin/open " & quoted form of (serverURL & "?v=" & cacheToken)
end run
