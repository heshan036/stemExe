var grunt=require('grunt');

//配置
grunt.config.init({
  pkg: grunt.file.readJSON('gruntPackage.json'),
  'create-windows-installer': {
    ia32:{
      version:'2.0.0',
      authors:'YBB Team, Talkweb co.ltd',
      projectUrl:'',
      appDirectory:'./release/win-ia32-unpacked',//要打包的输入目录
      outputDirectory:'./release/gruntOutput',//grunt打包后的输出目录
      exe:'云宝贝传统文化.exe',
      description: "智慧幼教是移动互联网时代，长征教育结合幼儿园的教育教学、园所管理、师资团队、家园共育、安全防护、宣传招生六大方面，从幼儿园整体运营出发，为幼儿园量身打造的信息化整体解决方案。包括：智慧课堂、智慧管理、智慧师训、智慧家园、智能卫士、微信招生号，全面打造数字化幼儿园。",
      setupIcon:"./resources/icon.ico",
      noMsi:true
    }
  }
});

//加载任务
grunt.loadNpmTasks('grunt-electron-installer');

//设置为默认
grunt.registerTask('default', ['create-windows-installer']);
